import { Cache } from "@raycast/api";
import { clearLastGood } from "./last-good";

/** Small TTL cache on top of Raycast's Cache for GET responses (60–120 s). "Refresh" actions bypass it. */
const cache = new Cache({ namespace: "folio-http" });
export const DEFAULT_TTL_MS = 90_000;

interface Entry<T> {
  at: number;
  value: T;
}

/** The cached value and when it was stored (epoch ms), if it's younger than `ttlMs`. */
export function cacheGetEntry<T>(key: string, ttlMs = DEFAULT_TTL_MS): Entry<T> | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.at > ttlMs) return undefined;
    return entry;
  } catch {
    return undefined;
  }
}

export function cacheGet<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | undefined {
  return cacheGetEntry<T>(key, ttlMs)?.value;
}

export function cacheSet<T>(key: string, value: T): void {
  cache.set(key, JSON.stringify({ at: Date.now(), value } satisfies Entry<T>));
}

let generation = 0;

/**
 * Bumped by every cacheClear(). A request that started before a clear (⌘R) must neither be joined by
 * requests made after it nor write its older response back into the cache.
 */
export function cacheGeneration(): number {
  return generation;
}

/** Clears the HTTP cache and Raycast's default cache namespace. */
export function cacheClear(): void {
  generation += 1;
  cache.clear();
  new Cache().clear();
}

/** Where views keep their last result for instant paint (see hooks.ts). ⌘R leaves it; sign-out clears it. */
export const VIEW_CACHE_NAMESPACE = "folio-view";

/** Everything Folio keeps on disk about the signed-in user's portfolio. Used on sign-in and sign-out. */
export async function clearSessionData(): Promise<void> {
  cacheClear();
  new Cache({ namespace: VIEW_CACHE_NAMESPACE }).clear();
  await clearLastGood();
}
