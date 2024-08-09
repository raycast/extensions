import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const backboardUrl = "https://backboard.railway.app/graphql/v2";
export const railwayWebUrl = "https://railway.app";

export const projectUrl = (projectId: string, page?: string): string =>
  `${railwayWebUrl}/project/${projectId}/${page ?? "settings"}`;

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
  me: {
    projects: ProjectEdgeGQL;
  };
}

export const fetchProjects = async (): Promise<ProjectGQL[]> => {
  const res = await gqlRequest<FetchProjectsQuery>(
    `query { 
      me{
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
      }
  }`,
  );
  const user = res?.me;

  if (user == null) {
    return [];
  }

  const projects = [...user.projects.edges.map((p) => p.node)];

  return projects;
};
