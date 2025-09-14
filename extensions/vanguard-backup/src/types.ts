export enum ServerStatusConnectivity {
    checking="checking",
    connected="connected",
    offline="offline",
    unknown="unknown"
}
export type Server = {
    id: number;
    user_id: number;
    label: string;
    connection: {
        ip_address: string
        username: string
        port: number
        is_database_password_set: boolean
    },
    status: {
        connectivity: ServerStatusConnectivity;
        last_connected_at: string;
    },
    created_at: string;
    updated_at: string;
}
export type CreateServer = {
  label: string;
  ip_address: string;
  username: string;
  port: number;
  database_password: string;
}

export enum BackupDestinationType {
    "Amazon S3"="s3",
        "Custom S3"="custom_s3",
        "DigitalOcean S3 Spaces"="digitalocean_spaces",
        Local="local"
}
export type BackupDestination = {
    id: number;
    user_id: number;
    label: string;
    type: BackupDestinationType;
    type_human: string;
    created_at: string;
    updated_at: string;
}
export type CreateBackupDestination = {
  label: string;
  type: BackupDestinationType;
  s3_access_key: string;
  s3_secret_key: string;
  s3_bucket_name: string;
  custom_s3_endpoint: string;
  custom_s3_region: string;
  path_style_endpoint: boolean;
}

export type SuccessResult<T> = {
    data: T;
}
export type PaginatedResult<T> = SuccessResult<T[]> & {
    next?: string | null;
}

export type ErrorResult = {
    error?: string;
    message: string;
    errors?: {
        [field: string]: string[];
    }
}