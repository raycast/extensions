import { Cache } from "@raycast/api";
import { CachedData, LibraryId, UIComponent } from "../types";

const cache = new Cache();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(libraryId: LibraryId): string {
  return `components-${libraryId}`;
}

/**
 * Get cached components for a library, or null if cache is missing/stale.
 */
export function getCached(libraryId: LibraryId): UIComponent[] | null {
  const raw = cache.get(cacheKey(libraryId));
  if (!raw) return null;

  try {
    const parsed: CachedData = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      return parsed.components;
    }
  } catch {
    // Cache is corrupted
  }
  return null;
}

/**
 * Store components in the cache for a library.
 */
export function setCache(libraryId: LibraryId, components: UIComponent[]): void {
  const data: CachedData = { timestamp: Date.now(), components };
  cache.set(cacheKey(libraryId), JSON.stringify(data));
}
