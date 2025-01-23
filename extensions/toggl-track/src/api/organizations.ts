import { get } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";

export function getMyOrganizations() {
  return get<Organization[]>("/me/organizations");
}

/** @see {@link https://developers.track.toggl.com/docs/api/organizations#response-1 Toggl Api} */
export interface Organization extends ToggleItem {
  /** Whether the requester is an admin of the organization */
  admin: boolean;
  created_at: string;
  is_multi_workspace_enabled: boolean;
  is_unified: boolean;
  /** How far back free workspaces in this org can access data */
  max_data_retention_days?: number;
  /** Maximum number of workspaces allowed for the organization */
  max_workspaces: number;
  name: string;
  /** Whether the requester is a the owner of the organization */
  owner: boolean;
  payment_methods?: string;
  pricing_plan_id: number;
  /** Organization's delete date */
  server_deleted_at: string | null;
  /** Whether the organization is currently suspended */
  suspended_at: string | null;
  trial_info: {
    /** What was the previous plan before the trial */
    last_pricing_plan_id: number | null;
    /** When the trial payment is due */
    next_payment_date: string | null;
    /** Whether the organization's subscription is currently on trial */
    trial: boolean;
    /** When a trial is available for this organization. */
    trial_available: boolean;
    trial_end_date: string;
  };
  user_count: number;
}
