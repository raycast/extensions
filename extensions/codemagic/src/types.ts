export interface Workflow {
  name: string;
}

export interface Application {
  _id: string;
  appName: string;
  workflowIds: string[];
  workflows: { [key: string]: Workflow };
  iconUrl?: string;

  isFavorite?: boolean;
}

export interface ApplicationsResponse {
  applications: Application[];
}

export enum BuildStatus {
  queued = "queued",
  preparing = "preparing",
  fetching = "fetching",
  building = "building",
  testing = "testing",
  publishing = "publishing",
  skipped = "skipped",
  canceled = "canceled",
  timeout = "timeout",
  failed = "failed",
  warning = "warning",
  finishing = "finishing",
  finished = "finished",
}

export interface Build {
  _id: string;
  appId: string;
  workflowId: string;
  fileWorkflowId?: string;
  branch: string;
  tag?: string;
  status: BuildStatus;
  startedAt?: string; // Date
  finishedAt: string; // Date
  // artefacts: Artefact[]
}

export interface BuildsResponse {
  applications: Application[];
  builds: Build[];
}
