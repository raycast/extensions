import { Cache } from "@raycast/api";

/** Path-only cache of results from earlier Spotlight queries. */
const cache = new Cache({ namespace: "discovered", capacity: 4_000_000 });
const KEY = "paths";

/** Maximum retained paths in recency order. */
const MAX_PATHS = 20_000;
/** Maximum paths added by one query. */
const MAX_PER_PASS = 300;

export function loadDiscovered(): string[] {
  const raw = cache.get(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === "string")
      : [];
  } catch {
    return [];
  }
}

export function rememberDiscovered(paths: string[]): string[] {
  if (paths.length === 0) return loadDiscovered();

  const fresh = paths.slice(0, MAX_PER_PASS);
  const existing = loadDiscovered();
  const seen = new Set(fresh);

  // Refresh surfaced paths before applying the global cap.
  const next = [...fresh, ...existing.filter((p) => !seen.has(p))].slice(
    0,
    MAX_PATHS,
  );

  try {
    cache.set(KEY, JSON.stringify(next));
  } catch {
    // A cache write failure does not affect current results.
  }
  return next;
}

/** Clears the namespace and returns its serialized byte count. */
export function clearDiscoveredCache(): number {
  const bytes = cache.get(KEY)?.length ?? 0;
  cache.clear({ notifySubscribers: false });
  return bytes;
}
