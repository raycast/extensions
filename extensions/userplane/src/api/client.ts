import { getPreferenceValues } from "@raycast/api";

import { normalizeOrigin } from "../utils/normalize-url";
import type {
  DomainsListData,
  LinkCreateData,
  LinksListData,
  LinksQuery,
  MembersListData,
  ProjectsListData,
  RecordingsListData,
  RecordingsQuery,
  WorkspaceSearchQuery,
  WorkspaceSearchResult,
  WorkspacesListData,
} from "./types";

const DEFAULT_API_HOST = "api.userplane.io";
const REQUEST_TIMEOUT_MS = 30_000;
// Keep in sync with package.json#version
const EXTENSION_VERSION = "0.1.0";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  query?: object;
  body?: unknown;
}

function getApiConfig() {
  const { apiKey, apiBaseUrl } = getPreferenceValues<Preferences>();
  return {
    baseUrl: `${normalizeOrigin(apiBaseUrl, DEFAULT_API_HOST)}/api/v1`,
    apiKey: apiKey.trim(),
  };
}

// Array params use bracket notation (`key[0]=v&key[1]=v`) to match the server's
// oRPC OpenAPIHandler, which parses query strings with StandardBracketNotationSerializer.
// Plain repeated `key=v&key=v` reaches the server as a single string and fails the
// `z.array(...)` schema with a 400.
// Ref: @orpc/openapi-client/dist/shared/openapi-client.t9fCAe3x.mjs (StandardBracketNotationSerializer.stringifyPath)
function serializeQuery(query: object | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item === undefined || item === null) return;
        params.append(`${key}[${i}]`, String(item));
      });
    } else {
      params.append(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function callApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { baseUrl, apiKey } = getApiConfig();
  const url = `${baseUrl}${path}${serializeQuery(options.query)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": `userplane-raycast/${EXTENSION_VERSION}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "Request timed out", "REQUEST_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // non-JSON body
    }
  }

  if (!response.ok) {
    const errObj = (parsed ?? {}) as { error?: string; message?: string };
    const code = errObj.error;
    const message = errObj.message || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, code);
  }

  if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
    throw new ApiError(response.status, "Malformed API response");
  }
  return (parsed as { data: T }).data;
}

export interface ListWorkspacesQuery {
  per_page?: number;
  include_workspace_membership?: boolean;
}

export interface ListDomainsQuery {
  per_page?: number;
}

export interface ListProjectsQuery {
  per_page?: number;
}

export interface ListMembersQuery {
  per_page?: number;
}

export interface ListLinksRequestQuery extends LinksQuery {
  page?: number;
  per_page?: number;
}

export interface ListRecordingsRequestQuery extends RecordingsQuery {
  page?: number;
  per_page?: number;
}

export interface CreateLinkBody {
  projectId?: string;
  domainId: string;
  linkReference?: string;
  linkReusable?: boolean;
  linkMeta: Record<string, string> | null;
}

export const api = {
  workspaces: {
    list(query: ListWorkspacesQuery = {}) {
      return callApi<WorkspacesListData>("/public/workspaces", { query });
    },
  },
  domains: {
    list(workspaceId: string, query: ListDomainsQuery = {}) {
      return callApi<DomainsListData>(`/public/workspace/${workspaceId}/domains`, { query });
    },
  },
  projects: {
    list(workspaceId: string, query: ListProjectsQuery = {}) {
      return callApi<ProjectsListData>(`/public/workspace/${workspaceId}/projects`, { query });
    },
  },
  members: {
    list(workspaceId: string, query: ListMembersQuery = {}) {
      return callApi<MembersListData>(`/public/workspace/${workspaceId}/members`, { query });
    },
  },
  links: {
    list(workspaceId: string, query: ListLinksRequestQuery = {}) {
      return callApi<LinksListData>(`/public/workspace/${workspaceId}/links`, { query });
    },
    create(workspaceId: string, body: CreateLinkBody) {
      return callApi<LinkCreateData>(`/public/workspace/${workspaceId}/links`, {
        method: "POST",
        body,
      });
    },
  },
  recordings: {
    list(workspaceId: string, query: ListRecordingsRequestQuery = {}) {
      return callApi<RecordingsListData>(`/public/workspace/${workspaceId}/recordings`, { query });
    },
  },
  search(workspaceId: string, query: WorkspaceSearchQuery) {
    return callApi<WorkspaceSearchResult>(`/public/workspace/${workspaceId}/search`, { query });
  },
};
