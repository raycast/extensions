export interface IServer {
  // Added by the extension, not the API
  api_token_key: string;
  ssh_user: string;
  org_slug: string;
  keywords?: string[];

  id: number;
  credential_id?: number | null;
  name?: string;
  slug?: string;
  type?: string;
  provider?: string;
  identifier?: string | null;
  size?: string;
  region?: string;
  ubuntu_version?: string;
  db_status?: string | null;
  redis_status?: string | null;
  php_version?: string;
  opcache_status?: string | null;
  php_cli_version?: string;
  database_type?: string;
  ip_address?: string;
  ssh_port?: number;
  private_ip_address?: string;
  local_public_key?: string;
  connection_status?: string;
  timezone?: string;
  revoked?: boolean;
  is_ready?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IRepository {
  provider?: string;
  url?: string;
  branch?: string;
  status?: string;
}

export interface ISite {
  // Not API attributes; both arrive as relationships on the site list
  server_id: number;
  latest_deployment?: IDeployment;

  id: number;
  name?: string;
  status?: string;
  url?: string;
  user?: string;
  https?: boolean;
  web_directory?: string;
  root_directory?: string;
  aliases?: string[];
  php_version?: string;
  deployment_status?: string | null;
  quick_deploy?: boolean;
  isolated?: boolean;
  shared_paths?: string[];
  repository?: IRepository | null;
  database?: string | null;
  maintenance_mode?: { enabled?: boolean; status?: string | null };
  zero_downtime_deployments?: boolean;
  deployment_script?: string | null;
  deployment_retention?: number | null;
  wildcards?: boolean;
  app_type?: string;
  uses_envoyer?: boolean;
  deployment_url?: string;
  healthcheck_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ConfigFile = "env" | "nginx" | "application-log" | "nginx-error-log" | "nginx-access-log";

export interface ICommit {
  hash?: string;
  author?: string;
  message?: string;
  branch?: string;
}

export interface IEvent {
  id: number;
  description?: string;
  ran_as?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IDeployment {
  id: number;
  status?: string;
  type?: string;
  commit?: ICommit | null;
  started_at?: string;
  ended_at?: string;
  created_at?: string;
  updated_at?: string;
}
