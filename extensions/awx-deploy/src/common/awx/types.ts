export interface AwxPreferences {
  awxUrl: string;
  awxToken: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface JobTemplate {
  id: number;
  name: string;
  description: string;
  job_type: string;
  playbook: string;
  ask_variables_on_launch?: boolean;
  last_job_run?: string | null;
  summary_fields?: {
    inventory?: { name: string };
    project?: { name: string };
    last_job?: { id: number; status: string; finished: string | null };
  };
}

export interface WorkflowJobTemplate {
  id: number;
  name: string;
  description: string;
  ask_variables_on_launch?: boolean;
  summary_fields?: {
    organization?: { name: string };
    last_job?: { id: number; status: string; finished: string | null };
  };
}

/** A node in a workflow's graph — usually wraps a job template ("stage"). */
export interface WorkflowNode {
  id: number;
  identifier?: string;
  success_nodes: number[];
  failure_nodes: number[];
  always_nodes: number[];
  unified_job_template: number | null;
  summary_fields?: {
    unified_job_template?: {
      id: number;
      name: string;
      description?: string;
      unified_job_type?: string;
    };
  };
}

export interface SurveyQuestion {
  question_name: string;
  question_description?: string;
  variable: string;
  /** text | textarea | password | integer | float | multiplechoice | multiselect | json */
  type: string;
  required: boolean;
  default?: string | number | string[];
  /** Newline-delimited string or an array, depending on AWX version. */
  choices?: string | string[];
  min?: number | null;
  max?: number | null;
}

export interface SurveySpec {
  name?: string;
  description?: string;
  spec?: SurveyQuestion[];
}

/** A row from /unified_jobs/ — covers jobs, project/inventory updates, workflows, etc. */
export interface UnifiedJob {
  id: number;
  type: string;
  name: string;
  status: string;
  started: string | null;
  finished: string | null;
  elapsed: number;
  summary_fields?: {
    job_template?: { id: number; name: string };
    unified_job_template?: { id: number; name: string };
  };
}

/** A completed/ongoing run of a workflow job template. */
export interface WorkflowJob {
  id: number;
  name: string;
  status: string;
  started: string | null;
  finished: string | null;
  elapsed: number;
  created: string;
  launch_type?: string;
  summary_fields?: {
    workflow_job_template?: { id: number; name: string };
    created_by?: { id: number; username: string };
  };
}

/** A node within a workflow *run* — carries the actual spawned job and its timing. */
export interface WorkflowJobNode {
  id: number;
  summary_fields?: {
    job?: { id: number; name: string; status: string; elapsed: number };
    unified_job_template?: { id: number; name: string };
  };
}

export interface LaunchResponse {
  id: number;
  job: number;
  ignored_fields?: Record<string, unknown>;
}

export const RUNNING_STATUSES = ["pending", "waiting", "running"] as const;
