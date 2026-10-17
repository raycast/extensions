import { Avatar } from "./avatar";
import { request } from "./request";

export type Project = {
  id: string;
  key: string;
  name: string;
  avatarUrls?: Avatar;
  style: "classic" | "next-gen";
};

type GetProjectsResponse = Project[];

export async function getProjects(query?: string) {
  const params = { maxResults: "100", query: query ?? "" };

  const result = await request<GetProjectsResponse>("/project", { params });

  if (!query) {
    return result;
  } else {
    const lowerCasedQuery = query.toLowerCase();
    return result?.filter(
      (result) =>
        result.name.toLowerCase().includes(lowerCasedQuery) || result.key.toLowerCase().includes(lowerCasedQuery),
    );
  }
}
