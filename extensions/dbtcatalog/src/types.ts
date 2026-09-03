// ============================================
// Preferences
// ============================================

export interface Preferences {
  dbtCloudAPIToken: string;
  dbtCloudAccountID: string;
  dbtCloudRegion: "us" | "emea" | "au" | "custom";
  dbtCloudCustomUrl?: string;
  dbtCloudCustomDiscoveryUrl?: string;
}

// ============================================
// Discovery API (GraphQL) Types
// ============================================

export interface DiscoveryResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

// Model from Discovery API - fields that actually exist in the schema
export interface ModelNode {
  uniqueId: string;
  name: string;
  description: string | null;
  database: string | null;
  schema: string | null;
  alias: string | null;
  resourceType: string;
  tags: string[];
  meta: Record<string, unknown>;
  access: string | null;
  group: string | null;
  contractEnforced: boolean;
  latestVersion: number | null;
  materializedType: string | null;
  compiledCode: string | null;
  rawCode: string | null;
  language: string | null;
  catalog: {
    columns: CatalogColumn[];
  } | null;
  ancestors?: LineageNode[];
  children?: LineageNode[];
  tests?: TestNode[];
}

export interface CatalogColumn {
  name: string;
  type: string | null;
  index: number | null;
  description: string | null;
  comment: string | null;
}

export interface TestNode {
  uniqueId: string;
  name: string;
  columnName: string | null;
}

// Lineage Node - can be Model, Source, Seed, Snapshot
export interface LineageNode {
  uniqueId: string;
  name: string;
  resourceType: string;
  // For sources
  sourceName?: string;
  // For models
  database?: string;
  schema?: string;
  alias?: string;
}

// Source from Discovery API - fields that actually exist in the schema
export interface SourceNode {
  uniqueId: string;
  name: string;
  sourceName: string;
  description: string | null;
  database: string | null;
  schema: string | null;
  identifier: string | null;
  resourceType: string;
  tags: string[];
  meta: Record<string, unknown>;
  loader: string | null;
  freshness: {
    freshnessJobDefinitionId: string | null;
    freshnessRunId: string | null;
    freshnessRunGeneratedAt: string | null;
    freshnessStatus: string | null;
    maxLoadedAt: string | null;
    snapshottedAt: string | null;
  } | null;
  children?: LineageNode[];
}

// ============================================
// Runs
// ============================================

export type RunsFetchResponse = RunModel[];

export interface RunModel {
  id: number;
  trigger_id: number;
  account_id: number;
  environment_id: number;
  project_id: number;
  job_definition_id: number;
  status: number;
  dbt_version: string;
  git_branch: string;
  git_sha: string;
  status_message: string;
  owner_thread_id: number;
  executed_by_thread_id: string;
  deferring_run_id: number;
  artifacts_saved: boolean;
  artifact_s3_path: string;
  has_docs_generated: boolean;
  has_sources_generated: boolean;
  notifications_sent: boolean;
  scribe_enabled: boolean;
  created_at: string;
  updated_at: string;
  dequeued_at: string;
  started_at: string;
  finished_at: string;
  should_start_at: string;
  href: string;
  status_humanized: string;
  finished_at_humanized: string;
  duration: string;
  duration_humanized: string;
  queued_duration: string;
  queued_duration_humanized: string;
  run_duration: string;
  run_duration_humanized: string;
  trigger: {
    cause: string;
    git_branch: string | null;
    git_sha: string | null;
  } | null;
  job: {
    id: number;
    name: string;
    project_id: number;
  };
  environment: {
    id: number;
    name: string;
  } | null;
  run_steps: RunStep[];
}

export interface RunStep {
  id: number;
  run_id: number;
  account_id: number;
  index: number;
  name: string;
  status: number;
  status_humanized: string;
  logs: string;
  debug_logs: string;
  log_location: string;
  log_path: string;
  duration: string;
  duration_humanized: string;
  created_at: string;
  updated_at: string;
  started_at: string;
  finished_at: string;
}

// ============================================
// Projects
// ============================================

export type ProjectsFetchResponse = ProjectModel[];

export interface ProjectModel {
  id: number;
  account_id: number;
  name: string;
  description: string;
  dbt_project_subdirectory: string | null;
  connection_id: number | null;
  repository_id: number | null;
  semantic_layer_config_id: number | null;
  state: number;
  created_at: string;
  updated_at: string;
  freshness_job_id: number | null;
  docs_job_id: number | null;
  repository: {
    id: number;
    full_name: string;
    remote_url: string;
    git_clone_strategy: string;
  } | null;
  connection: {
    id: number;
    name: string;
    type: string;
    adapter_version: string;
  } | null;
}

// ============================================
// Jobs
// ============================================

export type JobsFetchResponse = JobModel[];

export interface JobModel {
  id: number;
  account_id: number;
  project_id: number;
  environment_id: number;
  name: string;
  description: string;
  dbt_version: string | null;
  triggers: {
    github_webhook: boolean;
    git_provider_webhook: boolean;
    custom_branch_only: boolean;
    schedule: boolean;
  };
  execute_steps: string[];
  settings: {
    threads: number;
    target_name: string;
  };
  state: number;
  generate_docs: boolean;
  schedule: {
    cron: string;
    date: {
      type: string;
      days?: number[];
      cron?: string;
    };
    time: {
      type: string;
      interval: number;
      hours?: number[];
      minutes?: number[];
    };
  };
  run_generate_sources: boolean;
  run_compare_changes: boolean;
  created_at: string;
  updated_at: string;
  deactivated: boolean;
  lifecycle_webhooks: boolean;
  lifecycle_webhooks_url: string | null;
  job_type: string;
  triggers_on_draft_pr: boolean;
  job_completion_trigger_condition: unknown | null;
  execution: {
    timeout_seconds: number;
  };
  next_run_humanized: string | null;
  next_run: string | null;
  most_recent_run: RunModel | null;
  project: {
    id: number;
    name: string;
  } | null;
  environment: {
    id: number;
    name: string;
  } | null;
}

// ============================================
// Environments
// ============================================

export type EnvironmentsFetchResponse = EnvironmentModel[];

// Environment deployment types (from dbt Cloud)
// production - End users interact with this
// staging - Pre-production testing
// development - Engineers work here
// general - Default/unclassified
export type EnvironmentDeploymentType = "production" | "staging" | "development" | "general";

export interface EnvironmentModel {
  id: number;
  account_id: number;
  project_id: number;
  name: string;
  dbt_version: string;
  type: string; // "deployment" or "development"
  deployment_type: EnvironmentDeploymentType | null; // "production", "staging", etc.
  use_custom_branch: boolean;
  custom_branch: string | null;
  supports_docs: boolean;
  state: number;
  created_at: string;
  updated_at: string;
  project: {
    id: number;
    name: string;
  } | null;
  connection: {
    id: number;
    name: string;
    type: string;
    adapter_version: string;
  } | null;
  credentials: {
    id: number;
    type: string;
    schema: string;
    target_name: string;
  } | null;
}
