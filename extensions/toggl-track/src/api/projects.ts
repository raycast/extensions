import { get, post, put, remove } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";

export async function getMyProjects(): Promise<Project[]> {
  return get<Project[]>("/me/projects?include_archived=true");
}

export function createProject(workspaceId: number, options: ProjectOptions) {
  return post<Project>(`/workspaces/${workspaceId}/projects`, options);
}

export function updateProject(workspaceId: number, projectId: number, options: Partial<ProjectOptions>) {
  return put<Project>(`/workspaces/${workspaceId}/projects/${projectId}`, options);
}

export function deleteProject(workspaceId: number, projectId: number, deletionMode: "delete" | "unassign") {
  return remove(`/workspaces/${workspaceId}/projects/${projectId}?teDeletionMode=${deletionMode}`);
}

export interface ProjectOptions {
  name: string;
  /** HEX value of the project color. */
  color?: string;
  is_private: boolean;
  /** Start date of the project timeframe in `YYYY-MM-DD` format. */
  start_date: string;
  /** End date of the project timeframe in `YYYY-MM-DD` format. */
  end_date?: string;
  client_id?: number;
  client_name?: string;
  active?: boolean;

  // --- Requires at least Starter subscription --- //
  template?: boolean;
  template_id?: number;
  recurring?: boolean;
  recurring_parameters?:
    | {
        custom_period: number;
        period: "custom";
        project_start_date: string;
      }
    | {
        period: "weekly" | "monthly" | "quarterly" | "yearly";
        project_start_date: string;
      };
  estimated_hours?: number;
  /** Whether estimates are based on task hours. */
  auto_estimates?: boolean;
  billable?: boolean;
  /** Hourly rate, premium feature */
  rate?: number;
  /** Project currency */
  currency?: string;

  /**
   * Project fixed fee, premium feature
   *
   * Requires a Premium or Enterprise subscription
   */
  fixed_fee?: number;
}

/** @see {@link https://developers.track.toggl.com/docs/api/projects#response-8 Toggl Api} */
export interface Project extends ToggleItem {
  active: boolean;
  actual_hours: number | null;
  actual_seconds: number | null;
  /**	Whether estimates are based on task hours, premium feature */
  auto_estimates: boolean | null;
  billable: boolean | null;
  client_id: number | null;
  color: string;
  created_at: string;
  /** premium feature */
  currency: string | null;
  /** Current project period, premium feature */
  current_period?: {
    end_date: string;
    start_date: string;
  };
  end_date?: string;
  estimated_hours: number | null;
  estimated_seconds: number | null;
  /** premium feature */
  fixed_fee: number | null;
  is_private: boolean;
  name: string;
  options: ProjectOptions;
  permissions?: string[];
  /** Hourly rate */
  rate: number | null;
  rate_last_updated: string | null;
  /** Whether the project is recurring, premium feature */
  recurring: boolean;
  /** Project recurring parameters, premium feature */
  recurring_parameters: RecurringParameters[] | null;
  server_deleted_at: string | null;
  start_date: string;
  status: "upcoming" | "active" | "ended" | "archived" | "deleted";
  /** Whether the project is used as template, premium feature */
  template: boolean | null;
  template_id: number | null;
  workspace_id: number;
}

interface RecurringParameters {
  custom_period: number;
  estimated_seconds: number;
  parameter_end_date: string | null;
  parameter_start_date: string;
  period: "custom" | "weekly" | "monthly" | "quarterly" | "yearly";
  project_start_date: string;
}
