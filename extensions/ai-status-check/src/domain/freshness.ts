import type { DataFreshness, ProviderSnapshot } from "./types";

export const FRESH_TTL_MS = 60_000;
export const STALE_TTL_MS = 24 * 60 * 60 * 1_000;

export function getDataFreshness(snapshot: ProviderSnapshot | undefined, now = Date.now()): DataFreshness {
  if (!snapshot) return "unavailable";

  const fetchedAt = Date.parse(snapshot.fetchedAt);
  if (!Number.isFinite(fetchedAt)) return "expired";

  const age = Math.max(0, now - fetchedAt);
  if (age <= FRESH_TTL_MS) return "fresh";
  if (age <= STALE_TTL_MS) return "stale";
  return "expired";
}
