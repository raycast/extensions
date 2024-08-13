import { Avatar } from "./avatar";
import { request } from "./request";

export type Project = {
  id: string;
  key: string;
  name: string;
  avatarUrls?: Avatar;
};

type GetProjectsResponse = {
  projects: Project[];
};

export async function getProjects(query: string) {
  const params = { maxResults: "500", query, allowEmptyQuery: "true" };

  const result = await request<GetProjectsResponse>("/projects/picker", { params });
  return result?.projects;
}
