import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const backboardUrl = "https://backboard.railway.app/graphql/v2";
export const railwayWebUrl = "https://railway.app";

export const projectUrl = (projectId: string, page?: string): string =>
  `${railwayWebUrl}/project/${projectId}/${page ?? ""}`;

const token = getPreferenceValues<Preferences>().railwayApiKey;

interface ProjectGQL {
  id: string;
  name: string;
  updatedAt: string;
  description: string;
  isPublic: boolean;
}

interface ProjectEdgeGQL {
  edges: Array<{
    node: ProjectGQL;
  }>;
}

interface Error {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: string[];
  extensions?: {
    code: string;
  };
  traceId: string;
}

export const gqlRequest = async <T>(query: string): Promise<T | null> => {
  const res = await fetch(backboardUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });

  const json = (await res.json()) as { errors: Error[]; data?: null } | { data: T };
  if ("errors" in json) throw new Error(json.errors[0].message);
  const data = json?.data || null;

  return data;
};

export interface FetchProjectsQuery {
  projects: ProjectEdgeGQL;
}

export const fetchProjects = async (): Promise<ProjectGQL[]> => {
  const res = await gqlRequest<FetchProjectsQuery>(
    `query {
        projects{
          edges{
            node{
              id
              name
              description
              updatedAt
              isPublic
            }
          }
      }
  }`,
  );

  if (res == null) {
    return [];
  }

  const projects = [...res.projects.edges.map((p) => p.node)];

  return projects;
};
