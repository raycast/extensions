import type { FavoroArea, FavoroSection, FavoroLink } from "./favoro";

/**
 * Bookmarks export API response (GET /v1/bookmarks)
 */
export interface BookmarksExportResponse {
  data: {
    exported_at: string;
    counts: {
      areas: number;
      sections: number;
      links: number;
    };
  };
  included: (FavoroArea | FavoroSection | FavoroLink)[];
  meta: {
    etag: string;
    cache_until: string;
  };
}

/**
 * Cached data structure stored in LocalStorage
 */
export interface CachedData {
  areas: FavoroArea[];
  sections: FavoroSection[];
  links: FavoroLink[];
  exportedAt: string;
  etag: string;
  cacheUntil: string;
}

/**
 * Cache metadata for quick status checks
 */
export interface CacheMetadata {
  exportedAt: string;
  etag: string;
  cacheUntil: string;
  counts: {
    areas: number;
    sections: number;
    links: number;
  };
}

/**
 * Cache status
 */
export type CacheStatus = "fresh" | "stale" | "syncing" | "empty" | "error";

/**
 * Cache hook return type
 */
export interface UseCacheResult {
  data: CachedData | undefined;
  status: CacheStatus;
  lastSynced: Date | undefined;
  isLoading: boolean;
  error: Error | undefined;
  sync: (force?: boolean) => Promise<void>;
  clear: () => Promise<void>;
}
