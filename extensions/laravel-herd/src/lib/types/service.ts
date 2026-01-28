import { ExternalApp } from "./externalApp";

export interface Service {
  category: ServiceCategory[];
  status: "installed" | "not installed";
  label: string;
  type: ServiceType;
  version: string;
  defaultPort: number;
  installedServices: InstalledService[];
}

export enum ServiceCategory {
  Database = "database",
  Cache = "cache",
  Queue = "queue",
  Storage = "storage",
  Search = "search",
  Realtime = "realtime",
}

export enum ServiceType {
  Mysql = "mysql",
  Postgres = "postgres",
  Mariadb = "mariadb",
  Redis = "redis",
  Mongodb = "mongodb",
  Meilisearch = "meilisearch",
  Reverb = "reverb",
  Minio = "minio",
}

export interface InstalledService {
  type: string;
  name: string;
  version: string;
  port: string;
  status: "active" | "stopped" | "error";
  apps: ExternalApp[];
  env: string;
  documentation: string;
  connectionURL: string;
}
