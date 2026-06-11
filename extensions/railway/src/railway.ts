import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const backboardUrl = "https://backboard.railway.app/graphql/v2";
const backboardInternalUrl = "https://backboard.railway.com/graphql/internal";
export const railwayWebUrl = "https://railway.app";
export const railwayComUrl = "https://railway.com";

export const projectUrl = (projectId: string, page?: string): string =>
  `${railwayWebUrl}/project/${projectId}/${page ?? ""}`;

export const templatePageUrl = (code: string): string => `${railwayComUrl}/template/${code}`;
export const templateDeployUrl = (code: string): string => `${railwayComUrl}/new/template/${code}`;

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
  const token = getPreferenceValues<Preferences.RailwayProjects>().railwayApiKey;
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

export interface TemplateGQL {
  id: string;
  code: string;
  name: string;
  description: string;
  image: string | null;
  deploymentCount: number;
  healthScore: number | null;
  creatorName: string;
  isVerified: boolean;
}

interface TemplateSearchGQL {
  templateSearch: {
    edges: Array<{ node: TemplateGQL }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const templateSearchQuery = `query templateSearch($query: String!, $first: Int, $after: String) {
  templateSearch(query: $query, first: $first, after: $after) {
    edges {
      node {
        id
        code
        name
        description
        image
        deploymentCount
        healthScore
        creatorName
        isVerified
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

export interface TemplateSearchResult {
  templates: TemplateGQL[];
  hasNextPage: boolean;
  endCursor: string | null;
}

interface TemplateDetailGQL {
  template: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    readme: string | null;
  } | null;
}

const templateDetailQuery = `query templateDetail($code: String!) {
  template(code: $code) {
    id
    code
    name
    description
    readme
  }
}`;

export const fetchTemplateDetail = async (code: string): Promise<string | null> => {
  const res = await fetch(backboardInternalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "templateDetail",
      query: templateDetailQuery,
      variables: { code },
    }),
  });

  const json = (await res.json()) as { errors?: Error[]; data?: TemplateDetailGQL };
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data?.template?.readme ?? null;
};

export const fetchTemplates = async (query: string, after?: string): Promise<TemplateSearchResult> => {
  const res = await fetch(backboardInternalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "templateSearch",
      query: templateSearchQuery,
      variables: { query, first: 50, after },
    }),
  });

  const json = (await res.json()) as { errors?: Error[]; data?: TemplateSearchGQL };
  if (json.errors) throw new Error(json.errors[0].message);
  if (!json.data) return { templates: [], hasNextPage: false, endCursor: null };

  return {
    templates: json.data.templateSearch.edges.map((e) => e.node),
    hasNextPage: json.data.templateSearch.pageInfo.hasNextPage,
    endCursor: json.data.templateSearch.pageInfo.endCursor,
  };
};
