import type { z } from "zod";
import { getApiBaseUrl } from "@/constants";
import { SpooError } from "@/lib/errors";
import { getStoredTokens, refreshAccessToken } from "@/api/auth";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions<T> {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  schema?: z.ZodType<T>;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const url = buildUrl(path, options.query);
  const token = await ensureAccessToken();
  const res = await performRequest(url, options, token);

  const final = res.status === 401 ? await retryWithRefresh(url, options) : res;
  return parseResponse(final, options.schema);
}

export async function apiDownload(
  path: string,
  query?: Record<string, string>,
): Promise<Blob> {
  const url = buildUrl(path, query);
  const token = await ensureAccessToken();
  const res = await fetch(url, { headers: authHeader(token) });
  if (!res.ok) throw await SpooError.fromResponse(res);
  return res.blob();
}

async function retryWithRefresh<T>(
  url: string,
  options: RequestOptions<T>,
): Promise<Response> {
  const tokens = await getStoredTokens();
  if (!tokens?.refreshToken) {
    throw new SpooError(
      401,
      "authentication_error",
      "Session expired. Please sign in again.",
    );
  }
  const freshToken = await refreshAccessToken(tokens.refreshToken);
  return performRequest(url, options, freshToken);
}

async function ensureAccessToken(): Promise<string> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    throw new SpooError(401, "authentication_error", "Not signed in");
  }
  if (!tokens.isExpired()) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    throw new SpooError(
      401,
      "authentication_error",
      "Session expired. Please sign in again.",
    );
  }
  return refreshAccessToken(tokens.refreshToken);
}

async function performRequest<T>(
  url: string,
  options: RequestOptions<T>,
  token: string,
): Promise<Response> {
  const headers: Record<string, string> = { ...authHeader(token) };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  return fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function parseResponse<T>(
  res: Response,
  schema?: z.ZodType<T>,
): Promise<T> {
  if (!res.ok) throw await SpooError.fromResponse(res);
  const data = await res.json();
  return schema ? schema.parse(data) : (data as T);
}

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  const url = new URL(path, `${getApiBaseUrl()}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}
