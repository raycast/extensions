interface Project {
  id: number;
  user_id: number;
  version: number;
  name: string;
  provider: string;
  plain_repository: string;
  repository: string;
  type: string;
  branch: string;
  push_to_deploy: boolean;
  webhook_id: number;
  status: string;
  should_deploy_again: number;
  deployment_started_at: string;
  deployment_finished_at: string;
  last_deployment_status: string;
  daily_deploys: number;
  weekly_deploys: number;
  last_deployment_took: number;
  retain_deployments: number;
  environment_servers: number[];
  folders: string[];
  monitor: string;
  new_york_status: string;
  london_status: string;
  singapore_status: string;
  token: string;
  created_at: string;
  updated_at: string;
  install_dev_dependencies: boolean;
  install_dependencies: boolean;
  quiet_composer: boolean;
  servers: Server[];
  has_environment: boolean;
  has_monitoring_error: boolean;
  has_missing_heartbeats: boolean;
  last_deployed_branch: string;
  last_deployment_id: number;
  last_deployment_author: string;
  last_deployment_avatar: string;
  last_deployment_hash: string;
  last_deployment_timestamp: string;
}

interface Server {
  id: number;
}
