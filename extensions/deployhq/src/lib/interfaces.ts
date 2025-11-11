export interface HostingService {
  readonly name: string;
  readonly url: string;
  readonly tree_url: string;
  readonly commits_url: string;
}

export interface Repository {
  readonly scm_type: string;
  readonly url: string;
  readonly port: string | null;
  readonly username: string | null;
  readonly branch: string;
  readonly cached: boolean;
  readonly hosting_service?: HostingService;
}

export interface Project {
  readonly name: string;
  readonly permalink: string;
  readonly identifier: string;
  readonly public_key: string;
  readonly repository?: Repository;
  readonly zone: string;
  readonly last_deployed_at: string | null;
  readonly auto_deploy_url: string;
}
