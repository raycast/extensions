import { Cache } from "@raycast/api";

/** Small TTL cache on top of Raycast's Cache for GET responses (60–120 s). "Refresh" actions bypass it. */
const cache = new Cache({ namespace: "folio-http" });
export const DEFAULT_TTL_MS = 90_000;

interface Entry<T> {
  at: number;
  value: T;
}

export function cacheGet<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.at > ttlMs) return undefined;
    return entry.value;
  } catch {
    return undefined;
  }
}

export function cacheSet<T>(key: string, value: T): void {
  cache.set(key, JSON.stringify({ at: Date.now(), value } satisfies Entry<T>));
}

/** Clears the HTTP cache and Raycast's default cache namespace (where useCachedPromise keeps rendered data). */
export function cacheClear(): void {
  cache.clear();
  new Cache().clear();
}
