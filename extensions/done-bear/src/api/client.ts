import { getAccessToken } from "@raycast/utils";
import { VIEWER_QUERY } from "./queries";
import type { WorkspaceSummary } from "./types";

const API_URL = "https://api.donebear.com";

async function getToken(): Promise<string> {
  const { token } = await getAccessToken();
  return token;
}

let cachedUserIdForToken: { token: string; userId: string } | null = null;

export async function getUserId(): Promise<string> {
  const token = await getToken();

  if (cachedUserIdForToken?.token === token) {
    return cachedUserIdForToken.userId;
  }

  // JWT: decode user ID from payload
  const parts = token.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1])) as { sub?: string };
      if (payload.sub) {
        cachedUserIdForToken = { token, userId: payload.sub };
        return payload.sub;
      }
    } catch {
      // Not a valid JWT, fall through to viewer query
    }
  }

  // Fallback: fetch from viewer query
  const data = await graphqlRequest<{ viewer: { id: string } }>(VIEWER_QUERY);
  cachedUserIdForToken = { token, userId: data.viewer.id };
  return data.viewer.id;
}

interface GraphqlError {
  message?: string;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: GraphqlError[];
}

export async function graphqlRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as GraphqlResponse<T>;

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }

  if (!json.data) {
    throw new Error("No data returned");
  }

  return json.data;
}

export async function fetchWorkspaces(): Promise<WorkspaceSummary[]> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workspaces: ${response.status}`);
  }

  const data = (await response.json()) as { workspaces: WorkspaceSummary[] };
  return data.workspaces;
}

interface PaginatedResponse<T> {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export async function paginateGraphql<T>(options: {
  query: string;
  variables: Record<string, unknown>;
  nodeKey: string;
}): Promise<T[]> {
  const results: T[] = [];
  let after: string | null = null;

  for (let page = 0; page < 100; page++) {
    const variables = { first: 100, after, ...options.variables };
    const data: Record<string, PaginatedResponse<T>> = await graphqlRequest(options.query, variables);

    const connection: PaginatedResponse<T> = data[options.nodeKey];
    results.push(...connection.nodes);

    if (!(connection.pageInfo.hasNextPage && connection.pageInfo.endCursor)) {
      break;
    }
    after = connection.pageInfo.endCursor;
  }

  return results;
}

interface SyncMutateTransaction {
  clientTxId: string;
  clientId: string;
  modelName: string;
  modelId: string;
  action: "INSERT" | "UPDATE" | "ARCHIVE" | "UNARCHIVE";
  payload: Record<string, unknown>;
}

interface SyncMutateRequest {
  batchId: string;
  transactions: SyncMutateTransaction[];
}

interface SyncMutateResponse {
  success: boolean;
  lastSyncId: string;
  results: Array<{
    clientTxId: string;
    success: boolean;
    syncId?: string;
    error?: string;
  }>;
}

export async function syncMutate(request: SyncMutateRequest): Promise<void> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/sync/mutate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sync mutate error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as SyncMutateResponse;

  if (!data.success) {
    const error = data.results.find((r) => !r.success);
    throw new Error(error?.error || "Sync mutation failed");
  }
}
