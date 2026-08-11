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
