import { get } from "@/api/togglClient";

export function getMyWorkspaces() {
  return get<Workspace[]>("/me/workspaces");
}

// https://developers.track.toggl.com/docs/api/workspaces#response-4
export interface Workspace {
  id: number;
  name: string;
  premium: boolean;
  admin: boolean;
  logo_url: string;
  /** Workspace on Premium subscription */
  business_ws: boolean;
  role: "admin" | "projectlead" | "teamlead" | "user";
  only_admins_may_create_projects: boolean;
  only_admins_may_create_tags: boolean;
  organization_id: number;
  projects_billable_by_default: boolean;
  projects_private_by_default: boolean;
}
