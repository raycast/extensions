export interface HostingService {
  name: string;
  url: string;
  tree_url: string;
  commits_url: string;
}

export interface Repository {
  scm_type: string;
  url: string;
  port: string | null;
  username: string | null;
  branch: string;
  cached: boolean;
  hosting_service?: HostingService;
}

export interface Project {
  name: string;
  permalink: string;
  identifier: string;
  public_key: string;
  repository?: Repository;
  zone: string;
  last_deployed_at: string;
  auto_deploy_url: string;
}
