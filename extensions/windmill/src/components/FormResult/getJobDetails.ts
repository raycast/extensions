import fetch from "node-fetch";
import { WorkspaceConfig } from "../../types";

export async function getJobDetails(workspace: WorkspaceConfig, jobId: string): Promise<JobDetails> {
  const url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/jobs_u/get/${jobId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workspace.workspaceToken}`,
    },
  });

  return (await response.json()) as JobDetails;
}

export interface JobDetails {
  running?: boolean;
  workspace_id?: string;
  id: string;
  parent_job?: string;
  created_by: string;
  created_at: string;
  started_at: string;
  duration_ms: number;
  success: boolean;
  script_path?: string;
  script_hash?: string;
  args?: object;
  result?: object | string;
  logs?: string;
  deleted?: boolean;
  raw_code?: string;
  canceled: boolean;
  canceled_by?: string;
  canceled_reason?: string;
  job_kind: string;
  schedule_path?: string;
  permissioned_as: string;
  flow_status?: {
    step?: number;
    modules?: Array<{
      type?: string;
      id?: string;
      job?: string;
      count?: number;
      iterator?: {
        index?: number;
        itered?: unknown[];
        args?: unknown;
      };
      flow_jobs?: string[];
      branch_chosen?: {
        type?: string;
        branch?: number;
      };
      branchall?: {
        branch?: number;
        len?: number;
      };
      approvers?: {
        resume_id?: number;
        approver?: string;
      }[];
    }>;
    failure_module?: {
      type?: string;
      id?: string;
      job?: string;
      count?: number;
      iterator?: {
        index?: number;
        itered?: unknown[];
      };
      flow_jobs?: string[];
      branch_chosen?: {
        type?: string;
        branch?: number;
      };
      branchall?: {
        branch?: number;
        len?: number;
      };
      approvers?: {
        resume_id?: number;
        approver?: string;
      }[];
      parent_module?: string;
    };
    retry?: {
      fail_count?: number;
      failed_jobs?: string[];
    };
  };
  raw_flow?: {
    modules?: Array<{
      id?: string;
      value?: {
        input_transforms?: {
          [key: string]: {
            value?: unknown;
            type?: string;
          };
        };
        content?: string;
        language?: string;
        path?: string;
        lock?: string;
        type?: string;
        tag?: string;
        concurrent_limit?: number;
        concurrency_time_window_s?: number;
      };
      stop_after_if?: {
        skip_if_stopped?: boolean;
        expr?: string;
      };
      sleep?: {
        value?: unknown;
        type?: string;
      };
      cache_ttl?: number;
      timeout?: number;
      summary?: string;
      mock?: {
        enabled?: boolean;
        return_value?: unknown;
      };
      suspend?: {
        required_events?: number;
        timeout?: number;
        resume_form?: {
          schema?: object;
        };
      };
      retry?: {
        constant?: {
          attempts?: number;
          seconds?: number;
        };
        exponential?: {
          attempts?: number;
          multiplier?: number;
          seconds?: number;
        };
      };
    }>;
    failure_module?: {
      id?: string;
      value?: {
        input_transforms?: {
          [key: string]: {
            value?: unknown;
            type?: string;
          };
        };
        content?: string;
        language?: string;
        path?: string;
        lock?: string;
        type?: string;
        tag?: string;
        concurrent_limit?: number;
        concurrency_time_window_s?: number;
      };
      stop_after_if?: {
        skip_if_stopped?: boolean;
        expr?: string;
      };
      sleep?: {
        value?: unknown;
        type?: string;
      };
      cache_ttl?: number;
      timeout?: number;
      summary?: string;
      mock?: {
        enabled?: boolean;
        return_value?: unknown;
      };
      suspend?: {
        required_events?: number;
        timeout?: number;
        resume_form?: {
          schema?: unknown;
        };
      };
      retry?: {
        constant?: {
          attempts?: number;
          seconds?: number;
        };
        exponential?: {
          attempts?: number;
          multiplier?: number;
          seconds?: number;
        };
      };
    };
    same_worker?: boolean;
    concurrent_limit?: number;
    concurrency_time_window_s?: number;
    skip_expr?: string;
    cache_ttl?: number;
  };
  is_flow_step: boolean;
  language?: string;
  is_skipped: boolean;
  email: string;
  visible_to_owner: boolean;
  mem_peak?: number;
  tag: string;
  type: "CompletedJob" | "QueuedJob";
}
