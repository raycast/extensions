import fetch from "node-fetch";
export const flyioGraphqlUrl = "https://api.fly.io/graphql";
export const flyioBaseUrl = "https://fly.io/apps/";
export interface AppNode {
  id: string;
  name: string;
  hostname: string;
}

export interface OrganizationNode {
  id: string;
  name: string;
  apps: AppConnection;
}

export interface AppEdge {
  node: AppNode;
}

export interface OrganizationEdge {
  node: OrganizationNode;
}

export interface AppConnection {
  edges: AppEdge[];
}

export interface OrganizationConnection {
  edges: OrganizationEdge[];
}

export interface QueryResult {
  organizations: OrganizationConnection;
}

export const gqlRequest = async <T = any>(query: string, token?: string): Promise<T | null> => {
  const res = await fetch(flyioGraphqlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token != null ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query }),
  });

  const json = (await res.json()) as any;
  const data: T | null = json?.data;

  return data;
};

export const fetchOrganizations = async (token: string): Promise<OrganizationConnection | null> => {
  const res = await gqlRequest<QueryResult>(
    `query { 
        organizations{
            edges{	
              node{
                id
                name
                apps{
                  edges{
                    node{
                      id
                      name
                      hostname
                    }
                  }
                }
              }
            }
          }
    }`,
    token
  );
  const organizations = res?.organizations;
  if (organizations == null) {
    return null;
  }

  return organizations;
};
