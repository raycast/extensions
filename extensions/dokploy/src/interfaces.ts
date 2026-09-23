export interface DockerContainer {
  containerId: string;
  name: string;
  image: string;
  ports: string;
  state: string;
  status: string;
}

export type ProjectId = string;

export interface Service {
  name: string;
  appName: string;
  description: string;
  createdAt: string;
}
export interface Application extends Service {
  applicationId: string;
  applicationStatus: "idle";
}
export interface Mariadb extends Service {
  mariadbId: string;
  applicationStatus: "idle";
}
export interface Mongo extends Service {
  mongoId: string;
  applicationStatus: "idle";
}
export interface Mysql extends Service {
  mysqlId: string;
  applicationStatus: "idle";
}
export interface Postgres extends Service {
  postgresId: string;
  applicationStatus: "idle";
}
export interface Redis extends Service {
  redisId: string;
  applicationStatus: "idle";
}
export interface Compose extends Service {
  composeId: string;
  composeStatus: "idle" | "done";
}

export interface ServiceCollections {
  applications: Application[];
  mariadb: Mariadb[];
  mongo: Mongo[];
  mysql: Mysql[];
  postgres: Postgres[];
  redis: Redis[];
  compose: Compose[];
}

export interface Environment extends ServiceCollections {
  environmentId: string;
  name: string;
  description: string;
  createdAt: string;
  env: string;
  projectId: ProjectId;
}

export interface ProjectBase {
  projectId: ProjectId;
  name: string;
  description: string;
  createdAt: string;
  organizationId: string;
  env: string;
}

export interface ModernProject extends ProjectBase {
  environments: Environment[];
}

export interface LegacyProject extends ProjectBase, ServiceCollections {}

export type Project = ModernProject | LegacyProject;

export interface Destination {
  destinationId: string;
  name: string;
  provider: string;
  accessKey: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  endpoint: string;
  createdAt: string;
}
export interface User {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    twoFactorEnabled: boolean;
  };
}

export interface Server {
  id: string;
  name: string;
  ipAddress?: string | null;
}

export type DatabaseKind = "mariadb" | "mongo" | "mysql" | "postgres" | "redis";

/** The full `<kind>.one` response for a database - unlike the row in a project tree, this carries credentials. */
export interface DatabaseDetail {
  appName: string;
  databaseUser?: string | null;
  databasePassword?: string | null;
  databaseName?: string | null;
  externalPort?: number | null;
  serverId?: string | null;
  /** Mongo only - changes the connection URI. */
  replicaSets?: boolean | null;
}

/**
 * A service's environment, as read from and written back to Dokploy.
 *
 * `null` and `""` are kept apart all the way through: Dokploy distinguishes "never set" from "set
 * to nothing", and a save that doesn't preserve that distinction quietly rewrites one as the other.
 */
export interface ServiceEnvironment {
  env: string | null;
  /** Applications only. `--build-arg` values, in the same `KEY=value` format as `env`. */
  buildArgs: string | null;
  /** Applications only. BuildKit secrets - mounted during the build, never baked into the image. */
  buildSecrets: string | null;
  /** Whether Dokploy materialises `env` into a `.env` file next to the source. */
  createEnvFile: boolean;
  /** False for every kind but applications, which are the only one with a build to configure. */
  supportsBuildFields: boolean;
}

export interface Domain {
  domainId: string;
  host: string;
  path?: string | null;
  /** The container's own port, not necessarily one reachable from outside directly. */
  port?: number | null;
  https?: boolean;
  /** Compose only - which container in the stack serves this domain. */
  serviceName?: string | null;
  /** False once the router backing this domain has been removed - Dokploy still lists it, but it 404s. */
  enabled?: boolean;
}

/** A scheduled database backup - the `backups` relation embedded in `<kind>.one`'s response. */
export interface Backup {
  backupId: string;
  /** Cron expression. */
  schedule: string;
  enabled?: boolean | null;
  prefix: string;
  destinationId: string;
  destination?: { name: string } | null;
  keepLatestCount?: number | null;
  /** The database name inside the engine to dump - not this extension's `Service.name`. */
  database: string;
  databaseType?: "postgres" | "mariadb" | "mysql" | "mongo" | "web-server" | "libsql";
  postgresId?: string | null;
  mariadbId?: string | null;
  mysqlId?: string | null;
  mongoId?: string | null;
  /** Compose only - the stack backed up, and which container in it. */
  composeId?: string | null;
  serviceName?: string | null;
}

interface Issue {
  code?: string;
  expected?: string;
  received?: string;
  path?: string[];
  message: string;
}
export interface ErrorResult {
  message: string;
  code?: string;
  issues?: Issue[];
}
