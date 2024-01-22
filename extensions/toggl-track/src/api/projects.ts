import { get } from "./togglClient";
import { hideArchivedProjects } from "../helpers/preferences";

export async function getMyProjects(): Promise<Project[]> {
  const projects = (await get<Project[]>("/me/projects")) || [];
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
