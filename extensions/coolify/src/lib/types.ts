export type Server = {
  uuid: string;
  description: string | null;
  name: string;
  ip: string;
  is_reachable: boolean;
  is_usable: boolean;
  user: string;
  port: string;
  settings: Record<string, string | number | boolean | null>;
};
export type ServerDetails = {
  uuid: string;
  name: string;
  description: string;
  high_disk_usage_notification_sent: boolean;
  ip: string;
  log_drain_notification_sent: boolean;
  port: number;
  private_key_id: number;
  proxy: {
    type: string;
    status: string;
    force_stop: boolean;
    last_saved_settings: string;
    last_applied_settings: string;
  };
  settings: Record<string, string | number | boolean | null>;
  swarm_cluster: null;
  team_id: number;
  unreachable_count: number;
  unreachable_notification_sent: boolean;
  user: string;
  validation_logs: null;
  created_at: string;
  updated_at: string;
};
export type CreateServer = {
  name: string;
  description: string;
  ip: string;
  port: string;
  user: string;
  private_key_uuid: string;
  is_build_server: boolean;
  instant_validate: boolean;
};

export type Resource = {
  id: number;
  uuid: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
  status: string;
};
export enum DatabaseType {
  Clickhouse = "standalone-clickhouse",
  DragonFly = "standalone-dragonfly",
  KeyDB = "standalone-keydb",
  MariaDB = "standalone-mariadb",
  MongoDB = "standalone-mongodb",
  MySQL = "standalone-mysql",
  PostgreSQL = "standalone-postgresql",
  Redis = "standalone-redis",
}
export type ResourceDetails = {
  id: number;
  uuid: string;
  name: string;
  status: string;
} & (
  | {
      type: "application" | DatabaseType;
      destination: {
        id: number;
        name: string;
        uuid: string;
        network: string;
        server_id: number;
        created_at: string;
        updated_at: string;
        server: ServerDetails;
      };
    }
  | {
      type: "service";
      server: ServerDetails;
    }
);

export type PrivateKey = {
  id: number;
  uuid: string;
  name: string;
  description: string;
  fingerprint: string | null;
  private_key: string;
  is_git_related: true;
  team_id: number;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: number;
  name: string;
  description: string | null;
  personal_team: boolean;
  show_boarding: boolean;
  created_at: string;
  updated_at: string;
};
export type TeamMember = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  two_factor_confirmed_at: string | null;
  force_password_reset: boolean;
  marketing_emails: boolean;
};

export type Project = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
};
export type ProjectDetails = Project & {
  environments: Environment[];
  team_id: number;
  updated_at: string;
  created_at: string;
};
export type CreateProject = {
  name: string;
  description: string;
};

export type Environment = {
  id: number;
  name: string;
  project_id: number;
  created_at: string;
  updated_at: string;
  description: string | null;
};
export type EnvironmentDetails = Environment & {
  applications: Resource[];
  mariadbs: Resource[];
  mongodbs: Resource[];
  mysqls: Resource[];
  postgresqls: Resource[];
  redis: Resource[];
  services: Resource[];
};

export type EnvironmentVariable = {
  uuid: string;
  is_build_time: boolean;
  is_literal: boolean;
  is_multiline: boolean;
  is_preview: boolean;
  is_really_required: boolean;
  is_required: boolean;
  is_shared: boolean;
  is_shown_once: boolean;
  key: string;
  order: number | null;
  real_value: string;
  value: string | null;
  version: string;
  created_at: string;
  updated_at: string;
};

export type MessageResult = {
  message: string;
};
