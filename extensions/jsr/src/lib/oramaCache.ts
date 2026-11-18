import type { OramaCreds } from "@/lib/parseBootPayload";

/** LocalStorage key for cached Orama Cloud credentials. Shared by the React hook and headless callers (AI tools). */
export const ORAMA_CACHE_KEY = "jsr-orama-creds";

/** How long cached credentials stay valid before a re-scrape is triggered. */
export const ORAMA_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedOramaCreds = OramaCreds & {
  cachedAt: number;
};

export const isCachedOramaCredsExpired = (entry: CachedOramaCreds | undefined | null): boolean => {
  if (!entry) return true;
  return Date.now() - entry.cachedAt > ORAMA_CACHE_TTL_MS;
};
