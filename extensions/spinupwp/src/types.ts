// SpinupWP API Types

export interface DiskSpace {
  total: number;
  available: number;
  used: number;
  updated_at: string;
}

export interface Database {
  server: string;
  host: string;
  port: number;
}

export interface Server {
  id: number;
  name: string;
  provider_name: string;
  ubuntu_version: string;
  ip_address: string;
  ssh_port: number;
  timezone: string;
  region: string;
  size: string;
  disk_space: DiskSpace;
  database: Database;
  ssh_publickey: string;
  git_publickey: string;
  connection_status: "connected" | "disconnected";
  reboot_required: boolean;
  upgrade_required: boolean;
  install_notes: string | null;
  created_at: string;
  status: "provisioning" | "provisioned" | "failed";
}

export interface Event {
  id: number;
  initiated_by: string;
  server_id: number;
  name: string;
  status: "queued" | "creating" | "updating" | "deleting" | "deployed" | "failed";
  output: string | null;
  created_at: string;
  started_at: string;
  finished_at: string;
}

export interface Pagination {
  previous: string | null;
  next: string | null;
  per_page: number;
  count: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
}

export interface EventResponse {
  event_id: number;
}

// Site Types

export interface AdditionalDomain {
  domain: string;
  redirect: { enabled: boolean };
  created_at: string;
}

export interface SiteDatabase {
  id: number;
  user_id: number;
  table_prefix: string;
}

export interface SiteBackups {
  files: boolean;
  database: boolean;
  paths_to_exclude: string;
  retention_period: number;
  next_run_time: string;
  storage_provider: {
    id: number;
    region: string;
    bucket: string;
  };
}

export interface SiteGit {
  repo: string;
  branch: string;
  deploy_script: string;
  push_enabled: boolean;
  deployment_url: string;
}

export interface Site {
  id: number;
  server_id: number;
  domain: string;
  additional_domains: AdditionalDomain[];
  site_user: string;
  php_version: string;
  public_folder: string;
  is_wordpress: boolean;
  page_cache: { enabled: boolean };
  https: { enabled: boolean };
  nginx: {
    uploads_directory_protected: boolean;
    xmlrpc_protected: boolean;
    subdirectory_rewrite_in_place: boolean;
  };
  database: SiteDatabase;
  backups: SiteBackups;
  wp_core_update: boolean;
  wp_theme_updates: number;
  wp_plugin_updates: number;
  git: SiteGit | null;
  basic_auth: { enabled: boolean; username: string };
  created_at: string;
  status: "deploying" | "deployed" | "failed";
}

// Account types for multi-account support

export interface Account {
  id: string;
  name: string;
  token: string;
}
