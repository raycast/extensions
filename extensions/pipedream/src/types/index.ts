export interface SavedWorkflow {
  id: string;
  customName: string;
  url: string;
  triggerCount: number;
  stepCount: number;
  showInMenuBar: boolean;
  sortOrder: number;
}

export interface UserInfo {
  data: {
    id: string;
    username: string;
    email: string;
    orgs: Array<{
      id: string;
      orgname: string;
      name: string;
      email: string;
    }>;
  };
}

export interface WorkflowError {
  id: string;
  indexed_at_ms: number;
  event: {
    original_event: {
      name: string;
      site: string;
      data: Record<string, string>;
      d: string;
      _id: string;
      formId: string;
    };
    original_context: {
      id: string;
      ts: string;
      pipeline_id: string | null;
      workflow_id: string;
      deployment_id: string;
      source_type: string;
      verified: boolean;
      hops: string | null;
      test: boolean;
      replay: boolean;
      owner_id: string;
      platform_version: string;
      workflow_name: string;
      resume: string | null;
      emitter_id: string;
      trace_id: string;
    };
    error: {
      code: string;
      msg: string;
      cellId: string;
      ts: string;
      stack: string;
    };
  };
  metadata: {
    emitter_id: string;
    emit_id: string;
    name: string;
  };
}

export interface WorkflowErrorResponse {
  page_info: {
    start_cursor: string;
    total_count: number;
    end_cursor: string;
    count: number;
    excluded_count: number;
  };
  data: WorkflowError[];
}

export interface WorkflowErrorInfo {
  errorCount: number;
  lastError?: WorkflowError;
}

export interface Preferences {
  PIPEDREAM_API_KEY: string;
}

export interface WorkflowDetails {
  id: string;
  name: string;
  active: boolean;
  triggers: unknown[];
  steps: unknown[];
}
