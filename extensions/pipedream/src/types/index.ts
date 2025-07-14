export type SortOption = "name" | "errors" | "triggers" | "steps";
export type FilterOption = "all" | "menuBar" | "notMenuBar" | "errors";

export interface SavedWorkflow {
  id: string;
  customName: string;
  /**
   * Optional folder used for grouping workflows in the UI. Defaults to an
   * empty string which represents the root level.
   */
  folder?: string;
  url: string;
  triggerCount: number;
  stepCount: number;
  showInMenuBar: boolean;
  sortOrder: number;
  active?: boolean;
  /**
   * Error resolution tracking
   */
  errorResolution?: {
    markedAsFixedAt: number; // timestamp when errors were marked as fixed
    lastKnownErrorCount: number; // error count when marked as fixed
    lastKnownErrorTimestamp?: number; // timestamp of the last known error when marked as fixed
    resolvedBy?: string; // user who marked as fixed
    notes?: string; // resolution notes
    resolutionTime?: number; // time taken to resolve in milliseconds
    attempts?: number; // number of resolution attempts
    lastAttemptAt?: number; // timestamp of last resolution attempt
    errorCategories?: Record<string, number>; // categories of errors when marked as fixed
  };
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

export type ErrorCategory =
  | "api_error"
  | "authentication_error"
  | "rate_limit_error"
  | "timeout_error"
  | "validation_error"
  | "network_error"
  | "configuration_error"
  | "data_processing_error"
  | "unknown";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

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

export interface WorkflowDetails {
  id: string;
  name?: string;
  triggers: unknown[];
  steps: unknown[];
}

export interface WorkflowEvent {
  id: string;
  timestamp: string;
  status: "success" | "error" | "pending";
  execution_time_ms: number;
  error_message?: string;
  event_data: Record<string, unknown>;
}

export interface EventHistory {
  page_info: {
    start_cursor: string;
    total_count: number;
    end_cursor: string;
    count: number;
  };
  data: WorkflowEvent[];
}

// Note: Preferences interface is auto-generated in raycast-env.d.ts
