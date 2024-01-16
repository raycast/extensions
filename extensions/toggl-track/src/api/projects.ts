import { get } from "./togglClient";
import { hideArchivedProjects } from "../helpers/preferences";

export async function getWorkspaceProjects(workspaceId: number): Promise<Project[] | null> {
  const projects = (await get<Project[] | null>(`/workspaces/${workspaceId}/projects?per_page=500`)) || [];
  return hideArchivedProjects ? projects.filter((p) => p.active) : projects;
}

// https://developers.track.toggl.com/docs/api/projects/index.html#response-8
export interface Project {
  active: boolean;
  billable: boolean;
  client_id: number;
  color: string;
  id: number;
  name: string;
  workspace_id: number;
}
