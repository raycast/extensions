export interface ResourceIdentifier {
  id: string;
  type: string;
}

export interface JsonApiResource<A> {
  id: string;
  type: string;
  attributes: A;
  relationships?: Record<string, { data?: ResourceIdentifier | null }>;
  links?: Record<string, string>;
}

export interface JsonApiList<A> {
  data: JsonApiResource<A>[];
  links?: { first?: string | null; last?: string | null; prev?: string | null; next?: string | null };
  meta?: { per_page?: number; next_cursor?: string | null; prev_cursor?: string | null };
}

export interface JsonApiSingle<A> {
  data: JsonApiResource<A>;
}

export interface OrgAttributes {
  name: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServerAttributes {
  id: number;
  credential_id?: number | null;
  name?: string;
  slug?: string;
  type?: string;
  ubuntu_version?: string | null;
  ssh_port?: number;
  provider?: string;
  identifier?: string | null;
  size?: string;
  region?: string;
  php_version?: string | null;
  php_cli_version?: string | null;
  opcache_status?: string | null;
  database_type?: string | null;
  db_status?: string | null;
  redis_status?: string | null;
  ip_address?: string | null;
  private_ip_address?: string | null;
  revoked?: boolean;
  created_at?: string;
  connection_status?: string | null;
  timezone?: string;
  local_public_key?: string | null;
  is_ready?: boolean;
}

export interface SiteRepository {
  provider?: string;
  url?: string | null;
  branch?: string | null;
  status?: string | null;
}

export interface SiteAttributes {
  name?: string;
  status?: string;
  url?: string;
  user?: string;
  https?: boolean;
  web_directory?: string;
  root_directory?: string | null;
  aliases?: string[];
  php_version?: string;
  deployment_status?: string | null;
  quick_deploy?: boolean | null;
  isolated?: boolean;
  repository?: SiteRepository | null;
  app_type?: string | null;
  deployment_url?: string;
  wildcards?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DeploymentCommit {
  hash?: string | null;
  author?: string | null;
  message?: string | null;
  branch?: string | null;
}

export interface DeploymentAttributes {
  commit?: DeploymentCommit | null;
  type?: string;
  status?: string;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContentAttributes {
  content: string;
}

export interface DeploymentOutputAttributes {
  output: string;
}
