export class AttioApiError extends Error {
  constructor(
    readonly status: number,
    readonly type: string, // "auth_error" | "rate_limit_error" | "invalid_request_error" | …
    readonly code: string,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "AttioApiError";
  }
}

export class AttioNetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AttioNetworkError";
  }
}

// Attio never returns 401 (spec §4.4, verified live): a rejected or
// under-scoped token is 403 with type "auth_error".
export const isAuthError = (e: unknown): e is AttioApiError =>
  e instanceof AttioApiError && e.status === 403 && e.type === "auth_error";
export const isRateLimited = (e: unknown): e is AttioApiError => e instanceof AttioApiError && e.status === 429;
export const isNetworkError = (e: unknown): e is AttioNetworkError => e instanceof AttioNetworkError;

/**
 * Attio sends Retry-After as an HTTP *date* (e.g. "Tue, 23 May 2023 14:42:01 GMT"),
 * not delta-seconds; handle both. `nowMs` is injectable for tests.
 */
export function parseRetryAfter(header: string | null, nowMs: number = Date.now()): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(header);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, at - nowMs);
}
