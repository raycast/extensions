// Thin Weights & Biases GraphQL client over the public endpoint.
// Auth is HTTP Basic with username "api" and the API key as the password.

export const GRAPHQL_ENDPOINT = "https://api.wandb.ai/graphql";
export const WEB_BASE = "https://wandb.ai";

/** Thrown when the API key is missing/invalid (HTTP 401/403). */
export class AuthError extends Error {
  constructor(message = "Invalid or unauthorized W&B API key") {
    super(message);
    this.name = "AuthError";
  }
}

export function authHeader(apiKey: string): string {
  return "Basic " + Buffer.from(`api:${apiKey}`).toString("base64");
}

async function gql<T>(apiKey: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(apiKey) },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401 || res.status === 403) throw new AuthError();
  if (!res.ok) throw new Error(`W&B API error: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error("W&B API returned no data");
  return json.data;
}

export interface Viewer {
  username: string;
  defaultEntity: string;
  entities: string[];
}

export interface Project {
  id: string;
  name: string;
  entityName: string;
  createdAt: string;
  lastActive: string | null;
  access: string | null; // "PRIVATE" | "PUBLIC" | "OPEN" | ...
  runCount: number | null;
}

export interface Run {
  id: string;
  name: string;
  displayName: string | null;
  state: string;
  createdAt: string;
  heartbeatAt: string | null;
}

/** Fetch the signed-in user and the entities (personal + teams) they belong to.
 *  Doubles as API-key validation: throws AuthError on a bad key. */
export async function getViewer(apiKey: string): Promise<Viewer> {
  const data = await gql<{
    viewer: {
      username: string;
      entity: string;
      teams: { edges: { node: { name: string } }[] };
      organizations: { name: string; teams: { name: string }[] }[];
    };
  }>(
    apiKey,
    `query {
      viewer {
        username
        entity
        teams(first: 100) { edges { node { name } } }
        organizations { name teams { name } }
      }
    }`,
  );

  const v = data.viewer;
  // Union team entities from both the teams connection and org membership —
  // some accounts populate one but not the other.
  const set = new Set<string>(v.teams.edges.map((e) => e.node.name));
  for (const org of v.organizations ?? []) {
    for (const t of org.teams ?? []) set.add(t.name);
  }
  set.add(v.username);
  set.add(v.entity);
  // Default entity first, then alphabetical.
  const entities = Array.from(set).sort((a, b) => (a === v.entity ? -1 : b === v.entity ? 1 : a.localeCompare(b)));
  return { username: v.username, defaultEntity: v.entity, entities };
}

export async function getProjects(apiKey: string, entity: string): Promise<Project[]> {
  const data = await gql<{ entity: { projects: { edges: { node: Project }[] } } | null }>(
    apiKey,
    `query ($e: String!) {
      entity(name: $e) {
        projects(first: 100) {
          edges { node { id name entityName createdAt lastActive access runCount } }
        }
      }
    }`,
    { e: entity },
  );
  const nodes = data.entity?.projects.edges.map((e) => e.node) ?? [];
  // Most-recently-active first.
  return nodes.sort((a, b) => (b.lastActive ?? "").localeCompare(a.lastActive ?? ""));
}

export interface RunsPage {
  runs: Run[];
  hasMore: boolean;
  endCursor: string | null;
}

/** Fetch one page of runs (most-recent first). Pass `after` (an endCursor from a
 *  previous page) to page through the full history without one huge request. */
export async function getRuns(
  apiKey: string,
  entity: string,
  project: string,
  opts: { first?: number; after?: string } = {},
): Promise<RunsPage> {
  const { first = 50, after } = opts;
  const data = await gql<{
    project: {
      runs: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; edges: { node: Run }[] };
    } | null;
  }>(
    apiKey,
    `query ($e: String!, $p: String!, $first: Int!, $after: String) {
      project(name: $p, entityName: $e) {
        runs(first: $first, after: $after, order: "-createdAt") {
          pageInfo { hasNextPage endCursor }
          edges { node { id name displayName state createdAt heartbeatAt } }
        }
      }
    }`,
    { e: entity, p: project, first, after },
  );
  const conn = data.project?.runs;
  return {
    runs: conn?.edges.map((e) => e.node) ?? [],
    hasMore: conn?.pageInfo.hasNextPage ?? false,
    endCursor: conn?.pageInfo.endCursor ?? null,
  };
}

export function projectUrl(entity: string, project: string): string {
  return `${WEB_BASE}/${encodeURIComponent(entity)}/${encodeURIComponent(project)}`;
}

export function runUrl(entity: string, project: string, runName: string): string {
  return `${WEB_BASE}/${encodeURIComponent(entity)}/${encodeURIComponent(project)}/runs/${encodeURIComponent(runName)}`;
}
