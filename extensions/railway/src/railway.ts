import fetch from "node-fetch";

export const backboardUrl = "https://backboard.railway.app/graphql";
export const railwayWebUrl = "https://railway.app";

export const projectUrl = (projectId: string, page?: string): string =>
  `${railwayWebUrl}/project/${projectId}/${page ?? "settings"}`;

export interface UserGQL {
  id: string;
  name: string;
}

export interface ProjectGQL {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
}

export const gqlRequest = async <T = any>(query: string, token?: string): Promise<T | null> => {
  const res = await fetch(backboardUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token != null ? { authorization: token } : {}) },
    body: JSON.stringify({ query }),
  });

  const json = (await res.json()) as any;
  const data: T | null = json?.data;

  return data;
};

export const createLoginSession = async (): Promise<string | null> => {
  const res = await gqlRequest<{ createLoginSession: string }>(`mutation { createLoginSession }`);
  return res?.createLoginSession ?? null;
};

export const consumeLoginSession = async (wordCode: string): Promise<string | null> => {
  const res = await gqlRequest<{ consumeLoginSession: string | null }>(
    `mutation { consumeLoginSession(code: "${wordCode}") }`
  );

  return res?.consumeLoginSession ?? null;
};

export interface FetchUserQuery {
  me: UserGQL;
}

export const fetchUser = async (token: string): Promise<UserGQL | null> => {
  const res = await gqlRequest<FetchUserQuery>(
    `query { 
    me { 
      id
      name
    }
  }`,
    token
  );
  const user = res?.me;
  return user ?? null;
};

export interface FetchProjectsQuery {
  me: {
    projects: ProjectGQL[];
    teams: Array<{
      projects: ProjectGQL[];
    }>;
  };
}

export const fetchProjects = async (token: string): Promise<ProjectGQL[]> => {
  const res = await gqlRequest<FetchProjectsQuery>(
    `query { 
    me { 
      projects { 
        id 
        name
        description
        updatedAt
      } 
      teams { 
        projects { 
          id 
          name
          description
          updatedAt
        }
      } 
    }
  }`,
    token
  );
  const user = res?.me;

  if (user == null) {
    return [];
  }

  const projects = [...user.projects, ...user.teams.flatMap((t) => t.projects)];
  projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return projects;
};

export const logout = async (token: string) => {
  await gqlRequest(`mutation { logout }`, token);
};
