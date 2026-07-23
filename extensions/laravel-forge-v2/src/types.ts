export interface IServer {
  api_token_key: string;
  ssh_user: string;
  org_slug: string;
  id: string;
  credential_id?: string | null;
  name?: string;
  type?: string;
  provider?: string;
  provider_id?: string | null;
  size?: string;
  region?: string;
  ubuntu_version?: string | null;
  db_status?: string | null;
  redis_status?: string | null;
  php_version?: string | null;
  opcache_status?: string | null;
  php_cli_version?: string | null;
  database_type?: string | null;
  ip_address?: string | null;
  ssh_port?: number;
  private_ip_address?: string | null;
  local_public_key?: string | null;
  connection_status?: string | null;
  timezone?: string;
  revoked?: boolean;
  created_at?: string;
  is_ready?: boolean;
  tags?: string[];
  keywords?: string[];
}

export interface ISite {
  id: string;
  server_id: string;
  org_slug: string;
  name?: string;
  aliases?: string[];
  directory?: string;
  wildcards?: boolean;
  status?: string;
  repository?: string;
  repository_provider?: string;
  repository_branch?: string;
  repository_status?: string;
  quick_deploy?: boolean;
  deployment_status?: string | null;
  is_online?: boolean;
  project_type?: string;
  php_version?: string;
  app?: string | null;
  created_at?: string;
  username?: string;
  deployment_url?: string;
  is_secured?: boolean;
  tags?: string[];
}

export type ConfigFile = "env" | "nginx";

export interface IDeployment {
  id: string;
  server_id?: string;
  site_id?: string;
  type?: string;
  commit_hash?: string;
  commit_author?: string;
  commit_message?: string;
  started_at?: string;
  ended_at?: string;
  status?: string;
  displayable_type?: string;
}
