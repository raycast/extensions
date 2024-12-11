interface Project {
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
interface Service {
  cloud_description: string;
  components: Component[];
  create_time: string;
  metadata: { [key: string]: string | boolean };
  node_count: number;
  service_name: string;
  service_type: string;
  state: State;
}
export interface ListServicesResult {
  services: Service[];
}

interface AivenError {
  message: string;
  status: number;
}
export interface ErrorResult {
  message: string;
  errors: AivenError[];
}
