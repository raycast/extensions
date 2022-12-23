export interface Site {
  account_name: string;
  account_slug: string;
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

export type DeployState =
  | 'retrying' // 0
  | 'new' // 0
  | 'pending_review' // 0
  | 'accepted' // 0
  | 'enqueued' // 0
  | 'building' // 25
  | 'uploading' // 50
  | 'uploaded' // 50
  | 'preparing' // 75
  | 'prepared' // 75
  | 'processing' // 100
  | 'error' // cross
  | 'rejected' // cross
  | 'skipped' // cross
  | 'cancelled' // cross
  | 'deleted' // cross
  | 'ready'; // check

export interface Deploy {
  branch: string;
  commit_ref?: string;
  commit_url?: string;
  committer?: string;
  context: 'production' | 'deploy-preview' | 'branch-deploy';
  created_at: string;
  deploy_time: number;
  deploy_ssl_url: string;
  id: string;
  links: {
    alias: string;
    branch?: string;
    permalink: string;
  };
  review_id: number;
  review_url: string;
  site_id: string;
  state: DeployState;
  title?: string;
  url: string;
}

export interface Domain {
  name: string;
  account_slug: string;
  account_name: string;
}

export interface Team {
  name: string;
  slug: string;
}

export interface Member {
  email: string;
  id: string;
  full_name: string;
  role: string;
}
