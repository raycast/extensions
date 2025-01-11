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
export type ResourceDetails = {
  id: number;
  uuid: string;
  name: string;
  status: string;
} & (
  | {
      type: "application" | "standalone-mysql";
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
  discord_enabled: boolean;
  discord_notifications_database_backups: boolean;
  discord_notifications_deployments: boolean;
  discord_notifications_scheduled_tasks: boolean;
  discord_notifications_status_changes: boolean;
  discord_notifications_test: boolean;
  discord_webhook_url: string | null;
  personal_team: boolean;
  resend_api_key: string | null;
  resend_enabled: boolean;
  show_boarding: boolean;
  smtp_enabled: boolean;
  smtp_encryption: string | null;
  smtp_from_address: string | null;
  smtp_from_name: string | null;
  smtp_host: string | null;
  smtp_notifications_database_backups: boolean;
  smtp_notifications_deployments: boolean;
  smtp_notifications_scheduled_tasks: boolean;
  smtp_notifications_status_changes: boolean;
  smtp_notifications_test: boolean;
  smtp_password: string | null;
  smtp_port: string | null;
  smtp_recipients: string | null;
  smtp_timeout: string | null;
  smtp_username: string | null;
  telegram_chat_id: string | null;
  telegram_enabled: boolean;
  telegram_notifications_database_backups: boolean;
  telegram_notifications_database_backups_message_thread_id: string | null;
  telegram_notifications_deployments: boolean;
  telegram_notifications_deployments_message_thread_id: string | null;
  telegram_notifications_scheduled_tasks: boolean;
  telegram_notifications_scheduled_tasks_thread_id: string | null;
  telegram_notifications_status_changes: boolean;
  telegram_notifications_status_changes_message_thread_id: string | null;
  telegram_notifications_test: boolean;
  telegram_notifications_test_message_thread_id: string | null;
  telegram_token: string | null;
  use_instance_email_settings: boolean;
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
  default_environment: string;
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

export type MessageResult = {
  message: string;
};
