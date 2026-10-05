export enum ServerStatusConnectivity {
  checking = "checking",
  online = "online",
  offline = "offline",
  unknown = "unknown",
}
export type Server = {
  id: number;
  user_id: number;
  label: string;
  connection: {
    ip_address: string;
    username: string;
    port: number;
    is_database_password_set: boolean;
  };
  status: {
    connectivity: ServerStatusConnectivity;
    last_connected_at: string;
  };
  created_at: string;
  updated_at: string;
};
export type CreateServer = {
  label: string;
  ip_address: string;
  username: string;
  port: number;
  database_password: string;
};

export enum BackupDestinationType {
  "Amazon S3" = "s3",
  "Custom S3" = "custom_s3",
  "DigitalOcean S3 Spaces" = "digitalocean_spaces",
  Local = "local",
}
export type BackupDestination = {
  id: number;
  user_id: number;
  label: string;
  type: BackupDestinationType;
  type_human: string;
  created_at: string;
  updated_at: string;
};
export type CreateBackupDestination = {
  label: string;
  type: BackupDestinationType;
  s3_access_key: string;
  s3_secret_key: string;
  s3_bucket_name: string;
  custom_s3_endpoint: string;
  custom_s3_region: string;
  path_style_endpoint: boolean;
};

export enum BackupTaskType {
  Files = "files",
  Database = "Database",
}
export enum BackupTaskFrequency {
  Daily = "daily",
  Weekly = "weekly",
}
export type CreateBackupTask = {
  remote_server_id: number;
  backup_destination_id: number;
  label: string;
  description: string;
  source_path: string;
  frequency: BackupTaskFrequency;
  maximum_backups_to_keep: number;
  type: BackupTaskType;
  time_to_run_at: string;
  store_path: string;
};
export type BackupTask = {
  id: number;
  user_id: number;
  remote_server_id: number;
  backup_destination_id: number;
  label: string;
  description: string | null;
  schedule: {
    frequency: BackupTaskFrequency;
    scheduled_utc_time: string;
    scheduled_local_time: string;
  };
  status: string;
  has_encryption_password: boolean;
  last_run_local_time: string | null;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: number;
  account_settings: {
    timezone: string;
  };
};

export type SuccessResult<T> = {
  data: T;
};
export type PaginatedResult<T> = SuccessResult<T[]> & {
  next?: string | null;
};

export type ErrorResult = {
  error?: string;
  message: string;
  errors?: {
    [field: string]: string[];
  };
};
