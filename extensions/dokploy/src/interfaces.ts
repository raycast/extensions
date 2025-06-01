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
interface Postgres extends Service {
  postgresId: string;
  applicationStatus: "idle";
}
interface Compose extends Service {
  composeId: string;
  composeStatus: "idle" | "done";
}
export interface Project {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  organizationId: string;
  env: string;
  applications: Application[];
  mariadb: [];
  mongo: [];
  mysql: [];
  postgres: Postgres[];
  redis: [];
  compose: Compose[];
}

export  interface Server {id: string; name: string};

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