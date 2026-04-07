// oxlint-disable no-use-before-define -- helper functions grouped after main exports
import { getAccessToken } from "@raycast/utils";

import { MY_WORKSPACES_QUERY, VIEWER_QUERY } from "./queries";
import type { WorkspaceSummary } from "./types";

const API_URL = "https://api.donebear.com";

const getToken = async (): Promise<string> => {
  const { token } = await getAccessToken();
  return token;
};

let cachedUserId: string | null = null;

export const getUserId = async (): Promise<string> => {
  if (cachedUserId) {
    return cachedUserId;
  }

  const token = await getToken();

  // JWT: decode user ID from payload
  const parts = token.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1])) as { sub?: string };
      if (payload.sub) {
        cachedUserId = payload.sub;
        return cachedUserId;
      }
    } catch {
      // Not a valid JWT, fall through to viewer query
    }
  }

  // Fallback: fetch from viewer query
  const data = await graphqlRequest<{ viewer: { id: string } }>(VIEWER_QUERY);
  cachedUserId = data.viewer.id;
  return cachedUserId;
};

interface GraphqlError {
  message?: string;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: GraphqlError[];
}

export const graphqlRequest = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
  const token = await getToken();
  const response = await fetch(`${API_URL}/graphql`, {
    body: JSON.stringify({ query, variables }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
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
};

export const fetchWorkspaces = async (): Promise<WorkspaceSummary[]> => {
  const data = await graphqlRequest<{ myWorkspaces: WorkspaceSummary[] }>(MY_WORKSPACES_QUERY);
  return data.myWorkspaces;
};

interface PaginatedResponse<T> {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export const paginateGraphql = async <T>(options: {
  query: string;
  variables: Record<string, unknown>;
  nodeKey: string;
}): Promise<T[]> => {
  const results: T[] = [];
  let after: string | null = null;

  for (let page = 0; page < 100; page += 1) {
    const variables = { after, first: 100, ...options.variables };
    const data: Record<string, PaginatedResponse<T>> = await graphqlRequest(options.query, variables);

    const connection: PaginatedResponse<T> = data[options.nodeKey];
    results.push(...connection.nodes);

    if (!(connection.pageInfo.hasNextPage && connection.pageInfo.endCursor)) {
      break;
    }
    after = connection.pageInfo.endCursor;
  }

  return results;
};

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
  results: {
    clientTxId: string;
    success: boolean;
    syncId?: string;
    error?: string;
  }[];
}

export const syncMutate = async (request: SyncMutateRequest): Promise<void> => {
  const token = await getToken();
  const response = await fetch(`${API_URL}/sync/mutate`, {
    body: JSON.stringify(request),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
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
};
