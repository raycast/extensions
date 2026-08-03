import { API_BASE, ANON_KEY } from "./config";
import { authorize, forceRefresh } from "./oauth";

/**
 * Thin JSON client over the Kyo REST API v1.
 * Docs: https://www.trykyo.com/docs/api
 *
 * - Every request carries `Authorization: Bearer kyo_at_…` and `apikey: <anon>`.
 * - Reads are keyset-paginated ({ data, next_cursor }); single reads/creates/
 *   updates return { data }.
 * - v1 has no DELETE (405 everywhere) — the only "removal" is detaching a
 *   junction row via ?detach=true.
 */

export interface ListResponse<T> {
  data: T[];
  next_cursor: string | null;
}

export interface KyoApiError {
  error: string;
  message?: string;
  request_id?: string;
}

export class KyoError extends Error {
  code: string;
  status: number;
  requestId?: string;

  constructor(status: number, body: KyoApiError) {
    super(body.message || body.error || `Request failed (${status})`);
    this.name = "KyoError";
    this.status = status;
    this.code = body.error || "unknown_error";
    this.requestId = body.request_id;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** internal: prevents infinite refresh loops on repeated 401s */
  _retried?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(API_BASE + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const accessToken = await authorize();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    apikey: ANON_KEY,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  // 401 -> token likely expired/rotated mid-flight. Refresh once and retry.
  if (response.status === 401 && !options._retried) {
    const refreshed = await forceRefresh();
    if (refreshed) {
      return request<T>(path, { ...options, _retried: true });
    }
    // Refresh token dead (rotated-out or revoked family): forceRefresh wiped
    // the stored credentials, so this authorize() runs a clean interactive
    // sign-in rather than replaying a dead access token.
    await authorize();
    return request<T>(path, { ...options, _retried: true });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  // Guard against non-JSON bodies (e.g. a platform 502 page) — surface a clean
  // KyoError instead of a JSON.parse crash.
  let parsed: unknown = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok)
      throw new KyoError(response.status, { error: `http_${response.status}` });
    throw new KyoError(502, {
      error: "invalid_response",
      message: "Kyo returned a non-JSON response.",
    });
  }

  if (!response.ok) {
    throw new KyoError(response.status, parsed as KyoApiError);
  }

  return parsed as T;
}

// ---- Reads ----------------------------------------------------------------

/** One page of a list resource. */
export function listPage<T>(
  resource: string,
  query?: RequestOptions["query"],
): Promise<ListResponse<T>> {
  return request<ListResponse<T>>(`/${resource}`, { query });
}

/** Auto-paginate through EVERY page — Kyo never truncates data, and neither do we. */
export async function listAll<T>(
  resource: string,
  query?: RequestOptions["query"],
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null | undefined;
  do {
    const page = await listPage<T>(resource, {
      ...query,
      limit: 200,
      cursor: cursor ?? undefined,
    });
    items.push(...page.data);
    cursor = page.next_cursor;
  } while (cursor);
  return items;
}

export async function getOne<T>(resource: string, id: string): Promise<T> {
  const res = await request<{ data: T }>(`/${resource}/${id}`);
  return res.data;
}

// ---- Writes ---------------------------------------------------------------

export async function createOne<T>(
  resource: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await request<{ data: T }>(`/${resource}`, {
    method: "POST",
    body,
  });
  return res.data;
}

export async function updateOne<T>(
  resource: string,
  id: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await request<{ data: T }>(`/${resource}/${id}`, {
    method: "PATCH",
    body,
  });
  return res.data;
}

/** Junction create (deal_people / deal_labels). */
export function attach<T>(
  resource: string,
  body: Record<string, unknown>,
): Promise<T> {
  return request<{ data: T }>(`/${resource}`, { method: "POST", body }).then(
    (r) => r.data,
  );
}

/** Junction detach via ?detach=true (the only "delete" v1 supports). */
export function detach(
  resource: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return request(`/${resource}`, {
    method: "POST",
    query: { detach: true },
    body,
  });
}
