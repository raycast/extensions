import type { ErrorKind, Snapshot } from "../types";
import { CredentialsError } from "./credentials";
import { UsageError, type UsageSource } from "./usage-api";

const MIN = 60_000;
export const RATE_LIMIT_DEFAULT_MS = 10 * MIN;
export const SCHEMA_BACKOFF_MS = 30 * MIN;
export const MAX_BACKOFF_MS = 30 * MIN;
export const CLICK_THROTTLE_MS = 20_000;

export type RefreshOptions = {
  force?: boolean;
  userInitiated?: boolean;
  now?: number;
};

export function exponentialBackoffMs(failures: number): number {
  return Math.min(MAX_BACKOFF_MS, 2 ** Math.max(1, failures) * MIN);
}

export function shouldFetch(snap: Snapshot, opts: RefreshOptions): boolean {
  const now = opts.now ?? Date.now();
  if (opts.force) return true;
  if (snap.backoffUntil && snap.backoffUntil > now) return false;
  if (opts.userInitiated && snap.lastAttemptAt && now - snap.lastAttemptAt < CLICK_THROTTLE_MS) return false;
  return true;
}

export async function refresh(snap: Snapshot, source: UsageSource, opts: RefreshOptions = {}): Promise<Snapshot> {
  const now = opts.now ?? Date.now();
  if (!shouldFetch(snap, opts)) return snap;

  try {
    const { usage, plan } = await source.load();
    return {
      usage,
      plan: plan ?? snap.plan,
      lastError: null,
      backoffUntil: null,
      failures: 0,
      lastAttemptAt: now,
    };
  } catch (e) {
    return applyError(snap, e, now);
  }
}

export function applyError(snap: Snapshot, e: unknown, now: number): Snapshot {
  let kind: ErrorKind;
  let backoffUntil: number | null = null;
  let failures = 0;

  if (e instanceof CredentialsError) {
    kind = e.kind;
  } else if (e instanceof UsageError) {
    kind = e.kind;
    switch (e.kind) {
      case "unauthorized":
        break;
      case "rate_limited":
        backoffUntil = now + (e.retryAfterSec ? e.retryAfterSec * 1000 : RATE_LIMIT_DEFAULT_MS);
        break;
      case "schema":
        backoffUntil = now + SCHEMA_BACKOFF_MS;
        break;
      case "server":
      case "network":
        failures = snap.failures + 1;
        backoffUntil = now + exponentialBackoffMs(failures);
        break;
    }
  } else {
    kind = "network";
    failures = snap.failures + 1;
    backoffUntil = now + exponentialBackoffMs(failures);
  }

  return { ...snap, lastAttemptAt: now, lastError: { kind, at: now }, backoffUntil, failures };
}
