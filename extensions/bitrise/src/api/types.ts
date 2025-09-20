export type AppSlug = string;
export type OwnerSlug = string;
export type StepID = string;

export enum BuildStatus {
  InProgress = 0,
  Successful = 1,
  Failed = 2,
  AbortedWithFailure = 3,
  AbortedWithSuccess = 4,
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  paging: PagingResponse;
}

interface PagingResponse {
  next: string;
  page_item_limit: number;
  total_item_count: number;
}

export interface Build {
  build_number: number;
  slug: string;
  status: BuildStatus;
  status_text: string;
  triggered_workflow: string;
  commit_message?: string;
  pull_request_id?: number;
  pull_request_view_url?: string;
  abort_reason?: string;
  tag?: string;
  triggered_at: string;
  repository?: App; // Missing when querying builds of one app
}

export interface App {
  slug: AppSlug;
  title: string;
  avatar_url?: string;
  repo_url: string;
  owner: AppOwner;
}

export interface AppOwner {
  account_type: string;
  name: string;
  slug: string;
}

export interface AppsByOwner {
  owner: AppOwner;
  apps: App[];
}

export interface BuildsByStatus {
  inProgress: Build[];
  completed: Build[];
}

export interface BuildParams {
  branch?: string;
  workflow_id?: string;
  pipeline_id?: string;
  commit_message?: string;
}

export interface BuildTriggerResponse {
  build_number: number;
  build_url: string;
}

export interface Workflow {
  name: string;
  last_run_at: string;
}

export interface Pipeline {
  name: string;
  last_run_at: string;
}

export interface PipelinesAndWorkflows {
  active_pipelines: Pipeline[];
  active_workflows: Workflow[];
}

export interface StepCollection {
  updatedAt: Date;
  steps: Step[];
}

export enum StepMaintainer {
  Bitrise = "bitrise",
  Community = "community",
  Verified = "verified",
}

export interface Step {
  id: StepID;
  maintainer: StepMaintainer;
  iconURL: string;
  title: string;
  publishedAt: Date;
  sourceURL: string;
}
