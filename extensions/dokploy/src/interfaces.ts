export interface Application {
    applicationId: string;
    name: string;
    appName: string;
    description: string;
    applicationStatus: "idle";
    createdAt: string;
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
  postgres: [];
  redis: [];
  compose: [];
}