export type Database = {
  id: string;
  name: string;
  display_name: string;
  status: string;
  updated_at: number;
  type: "postgresql" | "mysql" | "mariadb" | "redis" | "valkey";
  version: string;
  resource_type_name: string;
};
export type DatabaseDetailed = {
  created_at: string;
  cluster: {
    id: string;
    location: string;
    display_name: string;
  };
  internal_hostname: string;
  internal_port: string;
  internal_connections: Array<{ id: string; type: string }>;
  data: {
    db_name: string;
    db_password: string;
    db_root_password: string | null;
    db_user: string | null;
  };
  external_connection_string: string;
  external_hostname: string | null;
  external_port: string | null;
};

export type Deployment = {
  id: string;
  branch: string;
  repo_url: string;
  commit_message: string | null;
  created_at: number;
};
export type DeploymentDetailed = {
  id: string;
  static_site_id: string;
  repo_url: string;
  branch: string;
  status: "waiting" | "inProgress" | "success" | "failed" | "cancelled";
  commit_sha: string | null;
  commit_message: string | null;
  author_login: string | null;
  author_img: string | null;
  cloud_build_id: string | null;
  created_at: number;
  updated_at: number;
  finished_at: number | null;
  started_at: number | null;
};

export type StaticSite = {
  id: string;
  name: string;
  display_name: string;
  status:
    | "deploymentInProgress"
    | "deploymentSuccess"
    | "deploymentFailed"
    | "deploymentCancelled"
    | "deleting"
    | "deletionFailed";
};
export type StaticSiteDetailed = StaticSite & {
  repo_url: string;
  default_branch: string;
  auto_deploy: boolean;
  remote_repository_id: string;
  git_repository_id: string | null;
  git_type: string;

  hostname: string;
  build_command: string | null;
  created_at: number;
  updated_at: number;
  deployments: Deployment[];
};
