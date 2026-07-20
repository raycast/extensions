import { createHash } from "node:crypto";

/**
 * Pure helpers for the shared usage cache. Kept free of Raycast imports so the
 * caching rules stay testable under the plain Node test runner.
 *
 * Payloads are written by `src/agents/hooks.ts` only, into a versioned cache
 * namespace — bump the namespace there whenever this shape changes so entries
 * written by older extension versions read as cache misses instead of
 * rendering with the wrong shape.
 */
export interface CachedUsagePayload<TUsage, TError> {
  usage: TUsage | null;
  error: TError | null;
  /** Epoch millis of the fetch that produced this payload. */
  timestamp: number;
  /** Hash of the auth material used for the fetch; a change invalidates the payload. */
  authHash: string;
}

export const DEFAULT_TTL_SECONDS = 180;

export function parseTtlSeconds(raw: string | undefined): number {
  const parsed = parseInt(raw ?? "", 10);
  if (Number.isNaN(parsed)) return DEFAULT_TTL_SECONDS;
  return Math.max(0, parsed);
}

export function hashAuthKey(material: string): string {
  return createHash("sha256").update(material).digest("hex");
}

export function hashAccountAuthKeys<TAccount extends { token: string }>(
  accounts: TAccount[],
  resolveAccountAuthKey: (account: TAccount) => string = (account) => account.token,
): string {
  return hashAuthKey(accounts.map(resolveAccountAuthKey).join("\n"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCachedPayload<TUsage, TError>(
  raw: string | undefined,
): CachedUsagePayload<TUsage, TError> | undefined {
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse usage cache payload:", error);
    return undefined;
  }
  if (
    !isRecord(parsed) ||
    !("usage" in parsed) ||
    !("error" in parsed) ||
    typeof parsed.timestamp !== "number" ||
    typeof parsed.authHash !== "string"
  ) {
    return undefined;
  }
  return parsed as unknown as CachedUsagePayload<TUsage, TError>;
}

/**
 * A payload only counts as fresh when it is a recent *success* for the same
 * auth material — errors are never fresh, so failed fetches are retried on the
 * next launch instead of being pinned for the TTL window.
 */
export function isPayloadFresh(
  payload: CachedUsagePayload<unknown, unknown>,
  nowMs: number,
  ttlMs: number,
  authHash: string,
): boolean {
  if (payload.usage === null || payload.error !== null) return false;
  if (payload.authHash !== authHash) return false;
  return nowMs - payload.timestamp < ttlMs;
}

/**
 * Multi-account payloads are only persisted when *every* row succeeded — the
 * freshness check can't see per-row errors (the top-level `error` is null), so
 * a cached partial failure would pin the failed account for the TTL window
 * instead of retrying it on the next launch.
 */
export function allAccountRowsSucceeded(rows: { usage: unknown; error: unknown }[]): boolean {
  return rows.length > 0 && rows.every((row) => row.usage !== null && row.error === null);
}

/** Drop token material before a row is persisted — the cache is unencrypted on disk. */
export function stripAccountTokens<TRow extends { token: string }>(rows: TRow[]): Omit<TRow, "token">[] {
  return rows.map((row) => {
    const rest: Partial<TRow> = { ...row };
    delete rest.token;
    return rest as Omit<TRow, "token">;
  });
}
