export interface DatabaseCluster {
  id: string;
  type: "databases";
  attributes: {
    name: string;
    type: DatabaseType;
    status: DatabaseStatus;
    region: string;
    config: Record<string, unknown>;
    connection: {
      hostname: string;
      port: number;
      protocol: string;
      driver: string;
      username: string;
      password: string;
    };
    created_at: string | null;
  };
  relationships?: {
    databases?: { data: { id: string; type: string }[] };
  };
}

export interface DatabaseSchema {
  id: string;
  type: "databaseSchemas";
  attributes: {
    name: string;
    created_at: string | null;
  };
  relationships?: {
    database?: { data: { id: string; type: string } | null };
    environments?: { data: { id: string; type: string }[] };
  };
}

export interface DatabaseSnapshot {
  id: string;
  type: "database_snapshots";
  attributes: {
    name: string;
    description: string | null;
    type: string;
    status: DatabaseSnapshotStatus;
    storage_bytes: number;
    pitr_enabled: boolean;
    pitr_ends_at: string | null;
    completed_at: string | null;
    created_at: string | null;
  };
}

export type DatabaseType =
  | "laravel_mysql_84"
  | "laravel_mysql_8"
  | "aws_rds_mysql_8"
  | "aws_rds_postgres_18"
  | "neon_serverless_postgres_18"
  | "neon_serverless_postgres_17"
  | "neon_serverless_postgres_16";

export type DatabaseStatus =
  | "creating"
  | "updating"
  | "restarting"
  | "upgrading"
  | "available"
  | "restoring"
  | "restore_failed"
  | "disabled"
  | "snapshotting_before_archiving"
  | "archiving"
  | "archived"
  | "deleting"
  | "deleted"
  | "unknown";

export type DatabaseSnapshotStatus = string;

export interface DatabaseTypeOption {
  type: DatabaseType;
  label: string;
  regions: string[];
  config_schema: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    enum?: unknown[];
  }[];
}
