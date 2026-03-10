/**
 * AFFiNE GraphQL API client for Raycast.
 * Uses the same queries as the public AFFiNE GraphQL API (Bearer token).
 */

const WORKSPACES_QUERY = `
  query {
    workspaces {
      id
      public
      createdAt
    }
  }
`;

const WORKSPACE_DOCS_QUERY = `
  query($workspaceId: String!) {
    workspace(id: $workspaceId) {
      docs(pagination: { first: 50 }) {
        edges {
          node {
            id
            title
            createdAt
            updatedAt
          }
        }
      }
    }
  }
`;

const SEARCH_DOCS_QUERY = `
  query($workspaceId: String!, $keyword: String!, $limit: Int!) {
    workspace(id: $workspaceId) {
      id
      searchDocs(input: { keyword: $keyword, limit: $limit }) {
        docId
        title
        highlight
        createdAt
        updatedAt
      }
    }
  }
`;

export interface AffineWorkspace {
  id: string;
  public: boolean;
  createdAt: string;
}

export interface AffineDoc {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffineSearchHit {
  docId: string;
  title: string;
  highlight?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  workspaceId: string;
  docs: AffineSearchHit[];
}

function ensureNoTrailingSlash(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export async function affineGraphQL<T>(
  baseUrl: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = `${ensureNoTrailingSlash(baseUrl)}/graphql`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "AFFiNE-Raycast/1.0",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AFFiNE API ${res.status}: ${text}`);
  }
  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(", "));
  }
  if (!json.data) {
    throw new Error("GraphQL response missing data");
  }
  return json.data as T;
}

export async function getWorkspaces(
  baseUrl: string,
  token: string,
): Promise<AffineWorkspace[]> {
  const data = await affineGraphQL<{ workspaces: AffineWorkspace[] }>(
    baseUrl,
    token,
    WORKSPACES_QUERY,
  );
  return data.workspaces ?? [];
}

export async function getWorkspaceDocs(
  baseUrl: string,
  token: string,
  workspaceId: string,
): Promise<AffineDoc[]> {
  const data = await affineGraphQL<{
    workspace: {
      docs: { edges: { node: AffineDoc }[] };
    };
  }>(baseUrl, token, WORKSPACE_DOCS_QUERY, { workspaceId });
  const edges = data.workspace?.docs?.edges ?? [];
  return edges.map((e) => e.node);
}

export async function searchWorkspace(
  baseUrl: string,
  token: string,
  workspaceId: string,
  keyword: string,
  limit: number,
): Promise<AffineSearchHit[]> {
  const data = await affineGraphQL<{
    workspace: {
      id: string;
      searchDocs: AffineSearchHit[];
    };
  }>(baseUrl, token, SEARCH_DOCS_QUERY, {
    workspaceId,
    keyword,
    limit,
  });
  return data.workspace?.searchDocs ?? [];
}

/** Search all workspaces and return flattened results with workspaceId. */
export async function searchAllWorkspaces(
  baseUrl: string,
  token: string,
  keyword: string,
  limitPerWorkspace: number = 20,
): Promise<SearchResult[]> {
  const workspaces = await getWorkspaces(baseUrl, token);
  const results: SearchResult[] = [];
  const perWs = Math.max(5, Math.ceil(limitPerWorkspace / workspaces.length));
  for (const ws of workspaces) {
    try {
      const docs = await searchWorkspace(baseUrl, token, ws.id, keyword, perWs);
      if (docs.length > 0) {
        results.push({ workspaceId: ws.id, docs });
      }
    } catch {
      // Skip workspace on error
    }
  }
  return results;
}

/** Build URL to open a document in the browser. */
export function docUrl(
  baseUrl: string,
  workspaceId: string,
  docId: string,
): string {
  return `${ensureNoTrailingSlash(baseUrl)}/workspace/${workspaceId}/${docId}`;
}

/**
 * Build URL to open a document in the AFFiNE desktop app (macOS/Windows/Linux).
 * Inferred from AFFiNE code: apps/electron deep-link.ts handles affine:// with pathname
 * /workspace/:id/:docId; optional ?new-tab=1 opens in new tab (addTabWithUrl).
 * Scheme: stable = "affine", canary/beta = "affine-canary" etc.; we use "affine".
 */
export function desktopAppUrl(
  baseUrl: string,
  workspaceId: string,
  docId: string,
  newTab = true,
): string {
  const base = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const host = new URL(base).host;
  const pathname = `/workspace/${workspaceId}/${docId}`;
  const params = new URLSearchParams();
  if (newTab) params.set("new-tab", "1");
  const q = params.toString();
  return `affine://${host}${pathname}${q ? `?${q}` : ""}`;
}

/** Build URL to open a workspace in the browser. */
export function workspaceUrl(baseUrl: string, workspaceId: string): string {
  return `${ensureNoTrailingSlash(baseUrl)}/workspace/${workspaceId}`;
}

/** Build URL for "new document" (opens workspace; user can create doc in UI). */
export function newDocUrl(baseUrl: string, workspaceId?: string): string {
  const base = ensureNoTrailingSlash(baseUrl);
  if (workspaceId) {
    return `${base}/workspace/${workspaceId}`;
  }
  return base;
}
