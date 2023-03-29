import { Avatar } from "./avatar";
import { request } from "./request";

export type Project = {
  id: string;
  key: string;
  name: string;
  avatarUrls: Avatar;
  style: "classic" | "next-gen";
};

type GetProjectsResponse = {
  values: Project[];
};

export async function getProjects() {
  const params = { maxResults: "100" };

  const result = await request<GetProjectsResponse>("/project/search", { params });
  return result?.values;
}
