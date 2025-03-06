export type RunsFetchResponse = RunModel[];

export interface RunModel {
  id: number;
  trigger_id: number;
  account_id: number;
  environment_id: number;
  project_id: number;
  job_definition_id: number;
  status: number;
  dbt_version: number;
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
  job: {
    name: string;
  };
}

export interface Preferences {
  dbtCloudAPIToken: string;
  dbtCloudAcountID: string;
}
