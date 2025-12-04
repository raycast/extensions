export interface Project {
  account_id: string;
  project_name: string;
  tags: {
    [key: string]: string;
  };
}
export interface ListProjectsResult {
  projects: Project[];
}

export enum State {
  POWEROFF = "POWEROFF",
  REBALANCING = "REBALANCING",
  REBUILDING = "REBUILDING",
  RUNNING = "RUNNING",
}
interface Component {
  component: string;
  host: string;
  port: number;
  route: "dynamic" | "public" | "private" | "privatelink";
  usage: "disaster_recovery" | "primary" | "replica";
}
export interface Service {
  cloud_description: string;
  components: Component[];
  create_time: string;
  features: {
    [feature: string]: boolean;
  };
  metadata: { [key: string]: string | boolean };
  node_count: number;
  service_name: string;
  service_type: string;
  service_type_description: string;
  state: State;
}
export interface ListServicesResult {
  services: Service[];
}

interface Backup {
  backup_name: string;
  backup_time: string;
  data_size: number;
  storage_location: string;
}
export interface ListServiceBackupsResult {
  backups: Backup[];
}

interface Log {
  hostname?: string;
  msg: string;
  time: string;
  unit: string;
}
export interface ListServiceLogsResult {
  logs: Log[];
}

interface AivenError {
  message: string;
  status: number;
}
export interface ErrorResult {
  message: string;
  errors: AivenError[];
}
