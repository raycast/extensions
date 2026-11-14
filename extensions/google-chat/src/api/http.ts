/**
 * Minimal typed HTTP client for Google REST APIs over `fetch`: bearer token, JSON bodies,
 * readable errors, and exponential backoff on 429/5xx (max 3 tries). No Raycast imports.
 */

import { withBackoff, parseRetryAfter, type BackoffOptions } from "../helpers/backoff";
import { GoogleApiError, isRetryableStatus, isScopeError, parseGoogleError } from "../helpers/errors";

export type QueryValue = string | number | boolean | string[] | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface HttpClientDeps {
  /** Returns a valid access token (refreshing or signing in if needed). */
  getToken: () => Promise<string>;
  /**
   * Called once when a request fails because the token lacks a scope. Return true after the
   * stored tokens were dropped so the request is retried with a fresh sign-in.
   */
  onScopeError?: () => Promise<boolean>;
  fetchImpl?: typeof fetch;
  backoff?: BackoffOptions;
}

/** Appends query parameters; arrays become repeated parameters. */
export function buildUrl(url: string, query: Record<string, QueryValue> = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.append(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}${url.includes("?") ? "&" : "?"}${search}` : url;
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(error.message);
}

export function createHttpClient(deps: HttpClientDeps) {
  const fetchImpl = deps.fetchImpl ?? fetch;

  async function once<T>(url: string, options: RequestOptions): Promise<T> {
    const token = await deps.getToken();
    const response = await fetchImpl(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
      throw parseGoogleError(response.status, text, parseRetryAfter(response.headers.get("retry-after")));
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  /** Sends a request to a full Google API URL and returns the parsed JSON body. */
  async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const fullUrl = buildUrl(url, options.query);
    const run = () =>
      withBackoff(
        () => once<T>(fullUrl, options),
        (error) => {
          if (error instanceof GoogleApiError && isRetryableStatus(error.status)) {
            return { retry: true, retryAfterMs: error.retryAfterMs };
          }
          return { retry: isNetworkError(error) };
        },
        deps.backoff,
      );
    try {
      return await run();
    } catch (error) {
      if (isScopeError(error) && deps.onScopeError && (await deps.onScopeError())) return run();
      throw error;
    }
  }

  return { request };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
