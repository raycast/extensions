export interface Preferences {
  token: string;
}

export type BBError {
  code: number;
  message: string;
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

export interface Domain {
  account_name: string;
  account_slug: string;
  name: string;
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
  | 'azure-devops'
  | 'bitbucket'
  | 'github'
  | 'github_enterprise'
  | 'gitlab'
  | 'gitlab_self_hosted'
  | 'unknown';

export interface Member {
  email: string;
  id: string;
  full_name: string;
  role: string;
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
}

export interface User {
  favorite_sites: string[];
}
