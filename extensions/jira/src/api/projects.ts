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
};

export async function getProjects(query?: string) {
  const maxResults = 100;
  let startAt = 0;
  let hasMore = true;
  const projects: Project[] = [];

  while (hasMore) {
    const params = {
      maxResults: String(maxResults),
      startAt: String(startAt),
      query: query ?? "",
    };

    const result = await request<GetProjectsResponse>("/project/search", { params });
    const values = result?.values ?? [];
    projects.push(...values);

    if (
      result?.isLast === true ||
      values.length < maxResults ||
      (result?.total !== undefined && projects.length >= result.total)
    ) {
      hasMore = false;
    } else {
      startAt += values.length;
    }
  }

  return projects;
}
