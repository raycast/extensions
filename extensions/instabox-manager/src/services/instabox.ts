import { getPreferenceValues } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";
import { ApiErrorBody } from "../types";

export const DEFAULT_API_URL = "https://api.instabox.sh";
export const DASHBOARD_URL = "https://dashboard.instabox.sh";
export const DOCS_URL = "https://instabox.sh/docs";
export const API_KEY_PREFIX = "ibk_";

export class InstaBoxError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly operationId?: string | null;
  readonly requestId?: string;

  constructor(status: number, body: Partial<ApiErrorBody>) {
    super(body.message || `InstaBox request failed (${status})`);
    this.name = "InstaBoxError";
    this.status = status;
    this.code = body.code || "unknown";
    this.retryable = body.retryable ?? false;
    this.operationId = body.operationId;
    this.requestId = body.requestId;
  }
}

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Sends an `Idempotency-Key`, which the API requires on most mutating requests. */
  idempotent?: boolean;
  signal?: AbortSignal;
}

function apiBaseUrl() {
  const { apiUrl } = getPreferenceValues<Preferences>();
  return (apiUrl?.trim() || DEFAULT_API_URL).replace(/\/+$/, "");
}

/**
 * Names the account behind the API key and URL, for cache keys, so cached data of one key or server is never
 * shown for another. A hash, so the key itself is not stored with the cache.
 */
export function accountScope() {
  const { apiKey } = getPreferenceValues<Preferences>();
  return createHash("sha256").update(`${apiBaseUrl()}\n${apiKey.trim()}`).digest("hex").slice(0, 16);
}

export function machinePath(id: string, suffix = "") {
  return `/v1/machines/${encodeURIComponent(id)}${suffix}`;
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const apiKey = getPreferenceValues<Preferences>().apiKey.trim();
  // Fail before the request so a pasted token or partial key reads as an auth error, as the API would report it.
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    throw new InstaBoxError(401, {
      code: "unauthenticated",
      message: `InstaBox API keys start with ${API_KEY_PREFIX}. Paste the full key from the dashboard.`,
    });
  }
  const url = new URL(apiBaseUrl() + path);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-API-Key": apiKey,
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotent) headers["Idempotency-Key"] = randomUUID();

  const response = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) throw new InstaBoxError(response.status, { message: text.slice(0, 200) });
      throw new Error("InstaBox returned a response that is not JSON");
    }
  }

  if (!response.ok) {
    const body = (data as { error?: ApiErrorBody } | undefined)?.error;
    throw new InstaBoxError(response.status, body ?? {});
  }
  return data as T;
}
