import { ApiError, messageForStatus } from "../lib/errors";
import { getApiBaseUrl } from "../lib/preferences";
import { getAccessToken, refreshAccessToken } from "../oauth/client";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 400;

/**
 * Authenticated JSON request against the Expiration Reminder API.
 *
 * - Injects `Authorization: Bearer {accessToken}`.
 * - Retries 429/5xx and transient network failures with exponential backoff + jitter.
 * - On a 401, performs a single silent token refresh and retries once.
 * - Normalizes error responses into {@link ApiError}.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return doRequest<T>(path, options, true);
}

async function doRequest<T>(path: string, options: RequestOptions, allowAuthRetry: boolean): Promise<T> {
  const url = buildUrl(path, options.query);
  const accessToken = await getAccessToken();

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  };

  const response = await fetchWithBackoff(url, init, options.signal);

  // Reactive refresh: refresh once and retry the original request transparently.
  if (response.status === 401 && allowAuthRetry) {
    await refreshAccessToken();
    return doRequest<T>(path, options, false);
  }

  return parseResponse<T>(response);
}

async function fetchWithBackoff(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  let attempt = 0;
  // Loop until we get a non-retryable response or exhaust retries.
  for (;;) {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (isAbort(error)) throw error;
      if (attempt >= MAX_RETRIES) throw new ApiError(messageForStatus(0, undefined), 0);
      await delay(backoffMs(attempt), signal);
      attempt++;
      continue;
    }

    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = retryAfterMs(response);
      await delay(retryAfter ?? backoffMs(attempt), signal);
      attempt++;
      continue;
    }

    return response;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(messageForStatus(response.status, body), response.status);
  }

  return body as T;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const search = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return `${base}${normalizedPath}${qs ? `?${qs}` : ""}`;
}

/** Exponential backoff with full jitter. */
function backoffMs(attempt: number): number {
  const ceiling = BASE_BACKOFF_MS * Math.pow(2, attempt);
  return Math.floor(Math.random() * ceiling) + BASE_BACKOFF_MS;
}

function retryAfterMs(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(date - Date.now(), 0) : undefined;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}
