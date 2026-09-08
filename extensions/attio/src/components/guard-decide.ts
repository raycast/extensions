import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { AttioApiError, isAuthError, isNetworkError, isRateLimited } from "../api/errors";
import type { Scope } from "../api/operations";

export type GuardInput = {
  selfIsActive: boolean | undefined;
  selfIsLoading: boolean;
  selfError: unknown;
  missing: readonly Scope[];
  error: unknown;
  hasLiveData: boolean;
};

export type GuardDecision =
  | { kind: "render" }
  | { kind: "loading" }
  | { kind: "stale" } // keep screen; toast already shown by useAttio's onError
  | { kind: "network" }
  | { kind: "auth" }
  | { kind: "scopes"; missing: readonly Scope[] }
  | { kind: "rate-limited"; retryAfterMs?: number }
  | { kind: "api-error"; message: string; code?: string };

/** Spec §6 branch table, evaluated top to bottom. Ordering is load-bearing. */
export function decide(i: GuardInput): GuardDecision {
  if (i.selfIsLoading && i.selfIsActive === undefined) return { kind: "loading" };
  if (i.hasLiveData && (i.error || i.selfError)) return { kind: "stale" };
  const err = i.error ?? i.selfError;
  if (isNetworkError(err)) return { kind: "network" };
  // Rate limits and 5xx are TEMPORARY — they must never render as "your token
  // was rejected", even when they come from /v2/self, and even when a second
  // error from the data fetch would otherwise win the `err` coalesce.
  const limited = isRateLimited(i.error) ? i.error : isRateLimited(i.selfError) ? i.selfError : undefined;
  if (limited) return { kind: "rate-limited", retryAfterMs: limited.retryAfterMs };
  const server = [i.error, i.selfError].find((e): e is AttioApiError => e instanceof AttioApiError && e.status >= 500);
  if (server) return { kind: "api-error", message: server.message, code: server.code };
  // /v2/self needs no scopes: any remaining 4xx from it means the token itself
  // is unusable (spec §14 — a malformed token returns 400 invalid_request_error,
  // not the assumed 200 {active:false}).
  if (isAuthError(err) || i.selfIsActive === false || i.selfError instanceof AttioApiError) return { kind: "auth" };
  if (i.missing.length > 0) return { kind: "scopes", missing: i.missing };
  if (err instanceof AttioApiError) return { kind: "api-error", message: err.message, code: err.code };
  if (err) return { kind: "api-error", message: getErrorMessage(err) };
  return { kind: "render" };
}
