import { request } from "./request";

export type Project = {
  id: string;
  name: string;
  workspaceId?: string;
  workspaceName?: string;
};

export async function getProjects() {
  const { data } = await request<Project[]>("/projects");
  return data;
}
