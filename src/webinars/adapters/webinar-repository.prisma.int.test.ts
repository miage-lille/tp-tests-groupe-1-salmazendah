// Test d'intégration
// C. Ecriture de notre premier test d'intégration
import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { promisify } from 'util';
const asyncExec = promisify(exec);

describe('PrismaWebinarRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;

  // on demarre la base de données et on exécute les migrations avant tous les tests
  beforeAll(async () => {
    // Connect to database
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    // on configure Prisma pour utiliser la base de données du conteneur
    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    // Run migrations to populate the database
    await asyncExec(
      `cross-env DATABASE_URL=${dbUrl} npx prisma migrate deploy`,
    );
    return prismaClient.$connect(); //se connecter a la BD
  });

  // Réinitialiser le repository et nettoyer la base de données avant chaque test
  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  //partie test:
  //test de la méthode create
  describe('Scenario : repository.create', () => {
    it('should create a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      // ACT
      await repository.create(webinar);
      // ASSERT
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });
  });

  //test de la méthode findById
  describe('Scenario: repository.findById', () => {
    it('should find a webinar by id', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-01T01:00:00Z'),
        seats: 100,
      });
      await prismaClient.webinar.create({
        data: {
          id: webinar.props.id,
          organizerId: webinar.props.organizerId,
          title: webinar.props.title,
          startDate: webinar.props.startDate,
          endDate: webinar.props.endDate,
          seats: webinar.props.seats,
        },
      });
      // ACT
      const foundWebinar = await repository.findById('webinar-id');
      // ASSERT
      expect(foundWebinar).toEqual(webinar);
    });

    it('should return null if the webinar does not exist', async () => {
      // ACT
      const foundWebinar = await repository.findById('non-existent-webinar-id');
      // ASSERT
      expect(foundWebinar).toBeNull();
    });
  });

  //test de la méthode update
  describe('Scenario: repository.update', () => {
    it('should update a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-01T01:00:00Z'),
        seats: 100,
      });
      await prismaClient.webinar.create({
        data: {
          id: webinar.props.id,
          organizerId: webinar.props.organizerId,
          title: webinar.props.title,
          startDate: webinar.props.startDate,
          endDate: webinar.props.endDate,
          seats: webinar.props.seats,
        },
      });

      // Mettre à jour le webinaire
      const updatedWebinar = new Webinar({
        ...webinar.props,
        title: 'Updated Webinar title',
        seats: 200,
      });

      // ACT
      await repository.update(updatedWebinar);

      // ASSERT
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Updated Webinar title',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-01T01:00:00Z'),
        seats: 200,
      });
    });

    //pour verifier que la méthode update lance une erreur si le webinar n'existe pas
    it('should throw an error if the webinar does not exist', async () => {
      // ARRANGE
      const nonExistentWebinar = new Webinar({
        id: 'non-existent-id',
        organizerId: 'organizer-id',
        title: 'Non-Existent Webinar',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-01T01:00:00Z'),
        seats: 100,
      });

      // ACT & ASSERT
      await expect(repository.update(nonExistentWebinar)).rejects.toThrow();
    });
  });

  //apres tous les tests
  afterAll(async () => {
    await container.stop({ timeout: 1000 }); // Arrêter le conteneur
    return prismaClient.$disconnect(); // Déconnecter Prisma
  });
});
