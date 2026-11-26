// Shared types for the Composer / Airflow 2.x stable REST API (/api/v1).
// Pure module: no @raycast/api imports, so scripts/smoke.ts can use it from plain Node.

export interface ComposerEnvironment {
  /** Full resource name: projects/{p}/locations/{l}/environments/{e} */
  name: string;
  /** Short environment name (last path segment). */
  id: string;
  project: string;
  location: string;
  state: string; // RUNNING | CREATING | UPDATING | DELETING | ERROR | STATE_UNSPECIFIED
  imageVersion: string; // e.g. composer-3-airflow-2.11.1-build.18
  airflowVersion?: string; // parsed from imageVersion, e.g. 2.11.1
  airflowUri: string; // Airflow web server base URL (no trailing slash)
  dagGcsPrefix?: string;
  createTime?: string;
  updateTime?: string;
  labels?: Record<string, string>;
}

export interface EnvironmentLookupError {
  project: string;
  location: string;
  status?: number;
  message: string;
}

export interface EnvironmentListing {
  environments: ComposerEnvironment[];
  errors: EnvironmentLookupError[];
}

export interface Tag {
  name: string;
}

export interface Dag {
  dag_id: string;
  dag_display_name?: string;
  description?: string | null;
  fileloc: string;
  is_paused: boolean | null;
  is_active: boolean | null;
  has_import_errors?: boolean | null;
  last_parsed_time?: string | null;
  next_dagrun?: string | null;
  next_dagrun_create_after?: string | null;
  max_active_runs?: number | null;
  owners: string[];
  tags: Tag[] | null;
  schedule_interval?: { __type: string; value?: string } | null;
  timetable_description?: string | null;
}

export interface DagDetails extends Dag {
  catchup?: boolean;
  start_date?: string | null;
  doc_md?: string | null;
  params?: Record<string, unknown>;
  dataset_expression?: unknown;
  timetable_summary?: string | null;
  default_view?: string;
  concurrency?: number;
  max_active_tasks?: number;
  last_parsed?: string | null;
}

export type DagRunState = "queued" | "running" | "success" | "failed";

export interface DagRun {
  dag_id: string;
  dag_run_id: string;
  run_type: "backfill" | "manual" | "scheduled" | "dataset_triggered" | string;
  state: DagRunState | string;
  execution_date?: string | null;
  logical_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  data_interval_start?: string | null;
  data_interval_end?: string | null;
  last_scheduling_decision?: string | null;
  external_trigger?: boolean;
  conf?: Record<string, unknown>;
  note?: string | null;
}

export type TaskInstanceState =
  | "success"
  | "running"
  | "failed"
  | "upstream_failed"
  | "skipped"
  | "up_for_retry"
  | "up_for_reschedule"
  | "queued"
  | "none"
  | "scheduled"
  | "deferred"
  | "removed"
  | "restarting"
  | null;

export interface TaskInstance {
  task_id: string;
  task_display_name?: string;
  dag_id: string;
  dag_run_id: string;
  execution_date?: string;
  start_date: string | null;
  end_date: string | null;
  duration: number | null;
  state: TaskInstanceState | string;
  try_number: number;
  map_index: number; // -1 = not mapped
  max_tries: number;
  hostname?: string;
  operator?: string | null;
  pool?: string;
  queue?: string | null;
  priority_weight?: number | null;
  queued_when?: string | null;
  rendered_fields?: Record<string, unknown>;
  note?: string | null;
}

export interface ImportError {
  import_error_id: number;
  filename: string;
  stack_trace: string;
  timestamp: string;
}

export interface HealthStatus {
  metadatabase?: { status: string };
  scheduler?: { status: string; latest_scheduler_heartbeat?: string | null };
  triggerer?: { status: string | null; latest_triggerer_heartbeat?: string | null };
  dag_processor?: { status: string | null; latest_dag_processor_heartbeat?: string | null };
}

export interface XComEntry {
  key: string;
  timestamp?: string;
  execution_date?: string;
  map_index?: number;
  task_id: string;
  dag_id: string;
  value?: unknown;
}

export interface TaskLog {
  content: string;
  /** Set when Airflow returned a partial log and more can be fetched. */
  continuationToken?: string;
}

/** Filter body for POST /api/v1/dags/~/dagRuns/list (a read, despite POST). */
export interface DagRunsBatchQuery {
  dag_ids?: string[];
  states?: DagRunState[];
  start_date_gte?: string;
  start_date_lte?: string;
  end_date_gte?: string;
  end_date_lte?: string;
  execution_date_gte?: string;
  execution_date_lte?: string;
  order_by?: string;
  page_limit?: number;
  page_offset?: number;
}

export interface Dataset {
  id: number;
  uri: string;
  extra?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  producing_tasks: { dag_id: string; task_id: string; created_at?: string }[];
  consuming_dags: { dag_id: string; created_at?: string }[];
  aliases?: unknown[];
}

export interface DatasetEvent {
  id: number;
  dataset_id: number;
  dataset_uri: string;
  extra?: Record<string, unknown> | null;
  source_dag_id?: string | null;
  source_task_id?: string | null;
  source_run_id?: string | null;
  source_map_index?: number;
  timestamp: string;
  created_dagruns?: { dag_id: string; dag_run_id: string; state?: string }[];
}

export interface QueuedEvent {
  uri: string;
  dag_id: string;
  created_at: string;
}

/** Filter body for POST /api/v1/dags/~/dagRuns/~/taskInstances/list (a read). */
export interface TaskInstancesBatchQuery {
  dag_ids?: string[];
  dag_run_ids?: string[];
  task_ids?: string[];
  state?: string[];
  start_date_gte?: string;
  start_date_lte?: string;
  execution_date_gte?: string;
  execution_date_lte?: string;
  page_limit?: number;
  page_offset?: number;
}

/** Thrown by the HTTP layer for non-2xx responses. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
