export interface AlgoliaHit {
  content?: string;
  hierarchy: {
    lvl0: 'In the docs' | 'On our blog' | 'On our site';
    lvl1: string;
    lvl2?: string;
    lvl3?: string;
    lvl4?: string;
    lvl5?: string;
    lvl6?: string;
  };
  objectID: string;
  url: string;
}

export interface AuditLog {
  id: string;
  payload: {
    actor_name: string;
    action: string;
    log_type: 'team' | 'site';
    timestamp: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traits: any;
  };
}

export interface Committer {
  id: string;
  last_seen: string;
  member_id?: string;
  provider: GitProvider;
  provider_slug: string;
}

export type DeployContext = 'production' | 'deploy-preview' | 'branch-deploy';

export type DeployState =
  | 'retrying'
  | 'new'
  | 'pending_review'
  | 'accepted'
  | 'enqueued'
  | 'building'
  | 'uploading'
  | 'uploaded'
  | 'preparing'
  | 'prepared'
  | 'processing'
  | 'error'
  | 'rejected'
  | 'skipped'
  | 'canceled'
  | 'cancelled'
  | 'deleted'
  | 'ready';

export interface Deploy {
  branch?: string;
  commit_ref?: string;
  commit_url?: string;
  committer?: string;
  context: DeployContext;
  created_at: string;
  deploy_time: number;
  deploy_ssl_url: string;
  error_message?: string;
  id: string;
  links: {
    alias: string;
    branch?: string;
    permalink: string;
  };
  manual_deploy: boolean;
  review_id?: number;
  review_url?: string;
  site_id: string;
  state: DeployState;
  title?: string;
  updated_at: string;
  url: string;
}

export interface Directory {
  fullPath: string;
  lastModified: number;
  name: string;
  remotes: Remote[];
  siteId: string;
}

export interface Domain {
  id: string;
  account_name: string;
  account_slug: string;
  created_at: string;
  domain?: {
    auto_renew: boolean;
    auto_renew_at: string;
    expires_at: string;
    renewal_price: string;
  };
  name: string;
  updated_at: string;
}

export interface DNSRecord {
  hostname: string;
  type: string;
  ttl: number;
  priority: number | null;
  weight: number | null;
  port: number | null;
  flag: number | null;
  tag: string | null;
  id: string;
  site_id: string | null;
  dns_zone_id: string;
  // errors: [],
  managed: boolean;
  value: string;
}

export interface CreateDNSRecord {
  type: string;
  hostname: string;
  value: string;
  ttl: number | null;
  priority: number | null;
  weight: number | null;
  port: number | null;
  flag: number | null;
  tag: string | null;
}

export interface DomainSearch {
  available: boolean;
  delegated_domain: string;
  name: string; // see api.searchDomains()
  owned_by_account?: boolean;
  price: string | null;
  renewal_price: string | null;
}

type Scope = 'builds' | 'functions' | 'runtime' | 'post-processing';
interface EnvVarValue {
  id: string;
  value: string;
  context:
    | 'all'
    | 'dev'
    | 'branch-deploy'
    | 'deploy-preview'
    | 'production'
    | 'branch';
  context_parameter?: string;
  role?: string;
}
export interface EnvVar {
  key: string;
  scopes: Scope[];
  values: EnvVarValue[];
  is_secret: boolean;
  updated_at: string;
  updated_by: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string;
  };
}

export type Framework =
  | 'angular'
  | 'astro'
  | 'eleventy'
  | 'gatsby'
  | 'hugo'
  | 'hydrogen'
  | 'next'
  | 'nuxt'
  | 'remix'
  | 'solid'
  | 'unknown'
  | null
  | undefined;

export type GitProvider =
  | 'azure'
  | 'azure-devops'
  | 'bitbucket'
  | 'github'
  | 'github_enterprise'
  | 'gitlab'
  | 'gitlab_self_hosted'
  | 'unknown';

export interface Member {
  avatar: string;
  connected_accounts: {
    bitbucket?: string;
    github?: string;
    gitlab?: string;
  };
  email: string;
  id: string;
  full_name: string;
  pending?: boolean;
  role: Role;
  site_access: 'all' | 'selected' | 'none';
}

export interface Reviewer {
  email: string;
  full_name?: string;
  id: string;
  state: 'pending' | 'approved';
}

export interface Remote {
  host: string;
  name: string;
  url: string;
}

export type Role = 'Owner' | 'Collaborator' | 'Controller';

export interface Site {
  account_name: string;
  account_slug: string;
  admin_url: string;
  build_settings: {
    provider: GitProvider;
    repo_path: string;
    repo_url: string;
  };
  created_at: string;
  id: string;
  name: string;
  published_deploy?: {
    framework?: Framework;
    published_at: string;
  };
  screenshot_url: string;
  ssl_url: string;
}

export interface Team {
  enforce_saml: 'not_enforced' | 'enforced_strict' | 'enforced_with_fallback';
  name: string;
  org_saml_enabled: boolean;
  role: Role;
  roles_allowed: Role[];
  slug: string;
  team_logo_url?: string;
  user_capabilities: {
    billing: { c: boolean };
    members: { c: boolean };
  };
}

export interface User {
  favorite_sites: string[];
  preferred_account_id: string;
}
