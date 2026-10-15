import { requirePlaneClient } from "./auth";
import { buildApiUrl, getApiBasePath, QueryValue } from "../helpers/urls";
import { extractErrorMessage, parseProblem, parseRetryAfter } from "../helpers/problem";
import { PlaneApiError } from "../helpers/plane-api-error";

export { PlaneApiError };

export type PlaneRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
};

export type PlaneResponse = {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Headers;
  body: unknown;
  url: string;
};

function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Sends one request with the client's auth headers. Resolves for every HTTP status; rejects on network errors. */
export async function sendPlaneRequest(url: string, options: PlaneRequestOptions = {}): Promise<PlaneResponse> {
  const client = requirePlaneClient();
  const hasBody = options.body !== undefined;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      // `X-API-Key` (v1 docs) and `X-Api-Key` (v2 docs) are the same header; names are case-insensitive.
      ...client.getAuthHeaders(),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });
  return {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: response.headers,
    body: parseBody(await response.text()),
    url,
  };
}

function toApiError(response: PlaneResponse): PlaneApiError {
  const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
  const detail = extractErrorMessage(response.body) || response.statusText || "Request failed";
  return new PlaneApiError(response.status, `${detail} (HTTP ${response.status})`, response.url, response.body, {
    code: parseProblem(response.body)?.code,
    retryAfter,
  });
}

/**
 * Typed `fetch` for v1 endpoints the pinned SDK (0.1.3) lacks or mis-parses.
 * Uses the same base path and auth headers as the SDK client.
 */
export async function planeRequest<T>(path: string, options: PlaneRequestOptions = {}): Promise<T> {
  const response = await sendPlaneRequest(buildApiUrl(getApiBasePath(), path, options.query), options);
  if (!response.ok) throw toApiError(response);
  return response.body as T;
}

/** Builds `workspaces/{slug}/...` with each segment URL-encoded. */
export function workspacePath(...segments: string[]): string {
  const slug = requirePlaneClient().workspaceSlug;
  return ["workspaces", slug, ...segments].map((segment) => encodeURIComponent(segment)).join("/");
}
