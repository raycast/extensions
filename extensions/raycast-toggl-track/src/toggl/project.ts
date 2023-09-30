import Toggl from "toggl-track";
import Projects from "../components/projects";

export interface Project {
  id: number;
  cid: number | null;
  name: string;
  billable: boolean;
  is_private: boolean;
  active: boolean;
  template: boolean;
  at: string; // This should be a timestamp
  created_at: string; // This should be a timestamp
  auto_estimates: boolean;
  actual_hours: number;
  color: string;
  wid: number;
  workspace_id: number;
  uid: number;
  user_id: number;
}

async function fetchProjects(client: Toggl): Promise<Project[]> {
  const projects = await client.me.projects();

  return projects;
}

const getProjectById = (projects: Project[], projectId: number) => {
  return projects.filter((project) => project.id === projectId).at(0);
};

export { fetchProjects, getProjectById };
