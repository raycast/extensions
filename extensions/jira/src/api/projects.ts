import { Avatar } from "./avatar";
import { request } from "./request";

export type Project = {
  id: string;
  key: string;
  name: string;
  avatarUrls?: Avatar;
  style: "classic" | "next-gen";
};

type GetProjectsResponse = {
  values: Project[];
  isLast?: boolean;
  total?: number;
  maxResults?: number;
};

export async function getProjects(query?: string) {
  const maxResults = 100;
  const projects: Project[] = [];
  let startAt = 0;

  while (true) {
    const params = { maxResults: String(maxResults), startAt: String(startAt), query: query ?? "" };
    const result = await request<GetProjectsResponse>("/project/search", { params });
    const values = result?.values ?? [];
    projects.push(...values);
    startAt += values.length;

    if (
      values.length === 0 ||
      result?.isLast === true ||
      (result?.total !== undefined && startAt >= result.total) ||
      (result?.isLast === undefined &&
        result?.total === undefined &&
        values.length < (result?.maxResults ?? maxResults))
    ) {
      return projects;
    }
  }
}
