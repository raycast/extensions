import { Cache } from "@raycast/api";
import { CachedData, ComponentSource, LibraryId, UIComponent } from "../types";

const cache = new Cache();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(libraryId: LibraryId): string {
  return `components-${libraryId}`;
}

/**
 * Get cached components for a library, or null if cache is missing/stale.
 * The source status is preserved so that fallback data stays marked as
 * fallback for the lifetime of the cache entry.
 */
export function getCached(libraryId: LibraryId): { components: UIComponent[]; source: ComponentSource } | null {
  const raw = cache.get(cacheKey(libraryId));
  if (!raw) return null;

  try {
    const parsed: CachedData = JSON.parse(raw);
    // Legacy entries (cached before source tracking) may hold static fallback
    // data that would otherwise be presented as a successful live scrape.
    // Treat them as stale so they are re-fetched with a correct source status.
    if (parsed.source === undefined) return null;

    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      return { components: parsed.components, source: parsed.source };
    }
  } catch {
    // Cache is corrupted
  }
  return null;
}

/**
 * Store components in the cache for a library, along with their source status.
 */
export function setCache(libraryId: LibraryId, components: UIComponent[], source: ComponentSource): void {
  const data: CachedData = { timestamp: Date.now(), components, source };
  cache.set(cacheKey(libraryId), JSON.stringify(data));
}
