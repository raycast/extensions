export interface IServer {
  api_token_key: string;
  ssh_user: string;
  id: number;
  credential_id?: string | null;
  name?: string;
  type?: string;
  provider?: string;
  provider_id?: string | null;
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
  blackfire_status?: string | null;
  papertrail_status?: string | null;
  revoked?: boolean;
  created_at?: string;
  is_ready?: boolean;
  tags?: string[];
  keywords?: string[];
  network?: string[];
}

export interface ISite {
  id: number;
  server_id: number;
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
  app_status?: string | null;
  slack_channel?: string | null;
  telegram_chat_id?: string | null;
  telegram_chatTitle?: string | null;
  teams_webhook_url?: string | null;
  discord_webhook_url?: string | null;
  created_at?: string;
  telegram_secret?: string;
  username?: string;
  deployment_url?: string;
  is_secured?: boolean;
  tags?: string[];
}

export type ConfigFile = "env" | "nginx";

export interface IDeployment {
  id: number;
  server_id?: number;
  site_id?: number;
  type?: number;
  commit_hash?: string;
  commit_author?: string;
  commit_message?: string;
  started_at?: string;
  ended_at?: string;
  status?: string;
  displayable_type?: string;
}
