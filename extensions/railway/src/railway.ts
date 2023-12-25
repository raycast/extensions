import fetch from "node-fetch";

export const backboardUrl = "https://backboard.railway.app/graphql/v2";
export const railwayWebUrl = "https://railway.app";

export const projectUrl = (projectId: string, page?: string): string =>
  `${railwayWebUrl}/project/${projectId}/${page ?? "settings"}`;

export interface ProjectGQL {
  id: string;
  name: string;
  updatedAt: string;
  description: string;
}

interface ProjectEdgeGQL {
  edges: [
    {
      node: {
        id: string;
        name: string;
        updatedAt: string;
        description: string;
      };
    },
  ];
}

export const gqlRequest = async <T = any>(query: string, token?: string): Promise<T | null> => {
  const res = await fetch(backboardUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token != null ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query }),
  });

  const json = (await res.json()) as any;
  const data: T | null = json?.data;

  return data;
};

export interface FetchProjectsQuery {
  me: {
    projects: ProjectEdgeGQL;
  };
}

export const fetchProjects = async (token: string): Promise<ProjectGQL[]> => {
  const res = await gqlRequest<FetchProjectsQuery>(
    `query { 
      me{
        projects{
          edges{
            node{
              id
              name
              description
              createdAt
            }
          }
        }
      }
  }`,
    token,
  );
  const user = res?.me;

  if (user == null) {
    return [];
  }

  const projects = [...user.projects.edges.map((p) => p.node)];

  return projects;
};
