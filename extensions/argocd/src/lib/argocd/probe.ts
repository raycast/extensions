/**
 * Reachability probe.
 *
 * The instances sit behind a VPN. Off it, every request hangs until its timeout, so a command
 * that queries three instances spends 45 seconds arriving at "everything is broken" when the
 * real answer is "you are not connected". One cheap probe up front turns that into a sub-second
 * answer, and lets the list render from cache with an honest explanation.
 *
 * GET /api/version answers 200 without authentication on ArgoCD 3.x, which is exactly what is
 * wanted here: it proves the network path and the server without ever being confusable with an
 * authorisation result. Nothing in the UI treats a successful probe as an authorisation.
 *
 * The path has no /v1: ArgoCD serves the version outside the versioned API, and /api/v1/version
 * is a 404. That 404 still counts as reachable, which is correct but was silent, so a reachable
 * probe now carries its non-2xx status in `reason` and the UI shows it.
 */

import type { ArgoInstance } from "../config/instances";

export type ReachabilityState = "reachable" | "unreachable" | "unknown";

export interface Reachability {
  state: ReachabilityState;
  checkedAt: number;
  latencyMs: number | undefined;
  version: string | undefined;
  reason: string | undefined;
}

export interface ProbeDeps {
  fetch: typeof globalThis.fetch;
  now: () => number;
  timeoutMs: number;
}

export const UNKNOWN_REACHABILITY: Reachability = {
  state: "unknown",
  checkedAt: 0,
  latencyMs: undefined,
  version: undefined,
  reason: undefined,
};

export const DEFAULT_PROBE_TTL_MS = 30_000;

/** Not /api/v1/version: ArgoCD serves the version outside the versioned API. */
export const VERSION_PATH = "/api/version";

export async function probeInstance(instance: ArgoInstance, deps: ProbeDeps): Promise<Reachability> {
  const startedAt = deps.now();

  let response: Response;
  try {
    response = await deps.fetch(`${instance.baseUrl}${VERSION_PATH}`, {
      method: "GET",
      // Deliberately no Authorization header: this endpoint is public, and sending a token
      // here would make a 401 ambiguous between "wrong token" and "server unreachable".
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(deps.timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    return {
      state: "unreachable",
      checkedAt: deps.now(),
      latencyMs: undefined,
      version: undefined,
      reason: timedOut
        ? `no answer within ${Math.round(deps.timeoutMs / 1000)}s`
        : "the network refused the connection",
    };
  }

  const latencyMs = deps.now() - startedAt;

  // Any HTTP answer at all proves the path exists, including a 4xx or a 5xx. Only a transport
  // failure means unreachable.
  let version: string | undefined;
  if (response.ok) {
    try {
      const body = (await response.json()) as { Version?: unknown };
      version = typeof body.Version === "string" ? body.Version : undefined;
    } catch {
      version = undefined;
    }
  }

  return {
    state: "reachable",
    checkedAt: deps.now(),
    latencyMs,
    version,
    reason: response.ok ? undefined : `answered ${response.status}`,
  };
}

export function isProbeStale(reachability: Reachability, now: number, ttlMs: number = DEFAULT_PROBE_TTL_MS): boolean {
  if (reachability.state === "unknown") {
    return true;
  }
  return now - reachability.checkedAt >= ttlMs;
}
