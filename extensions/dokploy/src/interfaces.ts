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