import type { ErrorKind, Snapshot, Usage } from "../types";
import type { LocalSource } from "./claude-code-source";
import { CredentialsError } from "./credentials";
import { UsageError, type UsageSource } from "./usage-api";

const MIN = 60_000;
export const MIN_FETCH_INTERVAL_MS = MIN;
export const LOCAL_FRESH_MS = 5 * MIN;
export const SCHEMA_BACKOFF_MS = 30 * MIN;
export const MAX_BACKOFF_MS = 30 * MIN;
const RATE_LIMIT_STEPS_MIN = [5, 10, 20, 30];

export type Sources = { api?: UsageSource; local?: LocalSource };

export type RefreshOptions = {
  force?: boolean;
  userInitiated?: boolean;
  now?: number;
};

export function exponentialBackoffMs(failures: number): number {
  return Math.min(MAX_BACKOFF_MS, 2 ** Math.max(1, failures) * MIN);
}

export function rateLimitBackoffMs(strikes: number): number {
  const i = Math.min(Math.max(1, strikes), RATE_LIMIT_STEPS_MIN.length) - 1;
  return RATE_LIMIT_STEPS_MIN[i] * MIN;
}

export function isRateLimited(snap: Snapshot, now: number): boolean {
  return (
    (snap.backoffKind ?? snap.lastError?.kind) === "rate_limited" && !!snap.backoffUntil && snap.backoffUntil > now
  );
}

export function shouldFetch(snap: Snapshot, opts: RefreshOptions): boolean {
  const now = opts.now ?? Date.now();
  if (isRateLimited(snap, now)) return false;
  if (opts.force) return true;
  if (!opts.userInitiated && snap.backoffUntil && snap.backoffUntil > now) return false;
  return !snap.lastAttemptAt || now - snap.lastAttemptAt >= MIN_FETCH_INTERVAL_MS;
}

const isNewer = (candidate: Usage | null, current: Usage | null): candidate is Usage =>
  !!candidate && candidate.fetchedAt > (current?.fetchedAt ?? 0);

export async function refresh(snap: Snapshot, sources: Sources, opts: RefreshOptions = {}): Promise<Snapshot> {
  const now = opts.now ?? Date.now();
  const local = sources.local ? await sources.local().catch(() => null) : null;
  const newerLocal = isNewer(local, snap.usage) ? local : null;

  if (newerLocal && now - newerLocal.fetchedAt < LOCAL_FRESH_MS) {
    return { ...snap, usage: newerLocal, lastError: null };
  }

  if (!sources.api) {
    if (newerLocal) return { ...snap, usage: newerLocal, lastError: null };
    if (!snap.usage && !local) return { ...snap, lastError: { kind: "not_connected", at: now } };
    return snap;
  }

  if (!shouldFetch(snap, opts)) {
    return newerLocal ? { ...snap, usage: newerLocal } : snap;
  }

  try {
    const { usage, plan } = await sources.api.load();
    return {
      usage,
      plan: plan ?? snap.plan,
      lastError: null,
      backoffUntil: null,
      backoffKind: null,
      failures: 0,
      lastAttemptAt: now,
    };
  } catch (e) {
    const next = applyError(snap, e, now);
    return newerLocal ? { ...next, usage: newerLocal } : next;
  }
}

export function applyError(snap: Snapshot, e: unknown, now: number): Snapshot {
  let kind: ErrorKind = "network";
  let backoffMs: number | null = null;
  let failures = 0;

  if (e instanceof CredentialsError) {
    kind = e.kind;
  } else if (e instanceof UsageError) {
    kind = e.kind;
    if (e.kind === "rate_limited") {
      failures = snap.failures + 1;
      backoffMs = Math.max(rateLimitBackoffMs(failures), (e.retryAfterSec ?? 0) * 1000);
    } else if (e.kind === "schema") {
      backoffMs = SCHEMA_BACKOFF_MS;
    } else if (e.kind === "server" || e.kind === "network") {
      failures = snap.failures + 1;
      backoffMs = exponentialBackoffMs(failures);
    }
  } else {
    failures = snap.failures + 1;
    backoffMs = exponentialBackoffMs(failures);
  }

  return {
    ...snap,
    lastAttemptAt: now,
    lastError: { kind, at: now },
    backoffUntil: backoffMs === null ? null : now + backoffMs,
    backoffKind: backoffMs === null ? null : kind,
    failures,
  };
}
