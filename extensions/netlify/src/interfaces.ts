export interface Preferences {
  token: string;
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

export interface Member {
  email: string;
  id: string;
  full_name: string;
  role: string;
}

export interface Site {
  account_name: string;
  account_slug: string;
  admin_url: string;
  build_settings: {
    repo_url: string;
    stop_builds: boolean;
    env: Record<string, string>;
  };
  created_at: string;
  id: string;
  name: string;
  published_deploy: {
    published_at: string;
  };
  screenshot_url: string;
  ssl_url: string;
}

export interface Team {
  name: string;
  slug: string;
  team_logo_url?: string;
}

export interface User {
  email: string;
  favorite_sites: string[];
  full_name: string;
}
