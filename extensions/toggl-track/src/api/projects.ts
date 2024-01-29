import type { ToggleItem } from "./types";
import { get } from "./togglClient";
import { hideArchivedProjects } from "../helpers/preferences";

export async function getMyProjects(): Promise<Project[]> {
  const projects = (await get<Project[]>("/me/projects")) || [];
  return hideArchivedProjects ? projects.filter((p) => p.active) : projects;
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
  period: string;
  project_start_date: string;
}
