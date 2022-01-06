export type Preferences = {
  apiKey: string;
  orgSlug: string;
}

export enum WorkflowStatus {
  success = "success",
  running = "running",
  not_run = "not_run",
  failed = "failed",
  error = "error",
  failing = "failing",
  on_hold = "on_hold",
  canceled = "canceled",
  unauthorized = "unauthorized",
}

export type Pipeline = {
  id: string;
  vcs: Repository;
  number: number;
  workflow?: Workflow;
  trigger: {
    actor: {
      avatar_url: string | null;
    }
  }
};

export type Workflow = {
  id: string;
  name: string;
  created_at: string;
  stopped_at: number;
  status: WorkflowStatus;
  project_slug: string;
  repository: Repository;
  pipeline_number: number;
};

export type Repository = {
  branch: string;
  provider_name: string;
  target_repository_url: string;
};

export enum JobStatus {
  success = "success",
  failed = "failed",
  running = "running",
}

export type Job = {
  id: string;
  started_at: string;
  stopped_at: string;
  project_slug: string;
  name: string;
  status: JobStatus;
};
