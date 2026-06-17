import { ErrorResponse } from "../types";

export type ProjectEnvsResponse = ProjectEnvsSuccess | ErrorResponse;

type ProjectEnvsSuccess = ProjectEnvsSuccessItem[];

interface ProjectEnvsSuccessItem {
  data: Data;
}
interface Data {
  app: App;
}
interface App {
  byFullName: ByFullName;
  __typename: string;
}
interface ByFullName {
  id: string;
  environmentVariables: EnvironmentVariablesItem[];
  __typename: string;
}

export interface EnvironmentVariablesItem {
  id: string;
  name: string;
  scope: string;
  value: string;
  environments: string[];
  visibility: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  isGlobal: boolean;
  fileName: null;
  apps: any[];
  __typename: string;
  linkedEnvironments: null | any[];
}

export type ProjectEnvsSenstiveResponse = ProjectEnvsSensitveSuccess | ErrorResponse;

type ProjectEnvsSensitveSuccess = ProjectEnvsSensitveSuccessItem[];

interface ProjectEnvsSensitveSuccessItem {
  data: Data;
}
interface Data {
  app: App;
}
interface App {
  byFullName: ByFullName;
  __typename: string;
}
interface ByFullName {
  id: string;
  environmentVariablesIncludingSensitive: EnvironmentVariablesIncludingSensitiveItem[];
  __typename: string;
}
interface EnvironmentVariablesIncludingSensitiveItem {
  id: string;
  name: string;
  scope: string;
  value: null | string;
  environments: string[];
  createdAt: string;
  __typename: string;
}
