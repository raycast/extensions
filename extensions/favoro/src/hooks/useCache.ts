import { useState, useEffect, useCallback, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { fetchBookmarks } from "../lib/api";
import {
  getCachedData,
  setCachedData,
  getCacheMetadata,
  clearCache,
  getCacheStatus,
  getLastSyncedDate,
  shouldRefreshCache,
} from "../lib/cache";
import { isAuthError } from "../lib/errors";
import type { CachedData, CacheStatus, UseCacheResult } from "../types";

interface UseCacheOptions {
  /** Callback when sync completes successfully with new data */
  onSyncComplete?: (data: CachedData) => void;
}

/**
 * Hook for managing the local bookmark cache.
 * Provides cache data, status, and sync functions.
 */
export function useCache(options: UseCacheOptions = {}): UseCacheResult {
  const { onSyncComplete } = options;
  const [data, setData] = useState<CachedData | undefined>(undefined);
  const [status, setStatus] = useState<CacheStatus>("empty");
  const [lastSynced, setLastSynced] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Track if initial load has been done
  const initialLoadDone = useRef(false);
  // Track if sync is in progress to prevent duplicate syncs
  const syncInProgress = useRef(false);

  /**
   * Sync cache with the API
   * @param force - If true, ignores ETag and fetches fresh data
   */
  const syncCache = useCallback(
    async (force: boolean = false): Promise<void> => {
      // Prevent duplicate syncs
      if (syncInProgress.current) {
        return;
      }
      syncInProgress.current = true;

      setIsLoading(true);
      setStatus("syncing");
      setError(undefined);

      try {
        const metadata = await getCacheMetadata();
        const etag = force ? undefined : metadata?.etag;

        const result = await fetchBookmarks(etag);

        if (result.status === "not_modified") {
          // Cache is still valid, just update status
          setStatus(metadata ? getCacheStatus(metadata, false) : "fresh");
        } else if (result.data) {
          // New data received
          await setCachedData(result.data);
          setData(result.data);
          setLastSynced(new Date(result.data.exportedAt));
          setStatus("fresh");

          await showToast({
            style: Toast.Style.Success,
            title: "Bookmarks Synced",
            message: `${result.data.links.length} links cached`,
          });

          // Call sync complete callback (e.g., for favorites validation)
          onSyncComplete?.(result.data);
        }
      } catch (err) {
        const syncError = err instanceof Error ? err : new Error("Sync failed");
        setError(syncError);
        setStatus("error");

        // Show error toast, but special handling for auth errors
        if (isAuthError(err)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Authentication Required",
            message: "Please reconnect to FAVORO",
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Sync Failed",
            message: syncError.message,
          });
        }
      } finally {
        setIsLoading(false);
        syncInProgress.current = false;
      }
    },
    [onSyncComplete],
  );

  /**
   * Load cached data from LocalStorage on mount
   */
  useEffect(() => {
    async function loadCache(): Promise<void> {
      if (initialLoadDone.current) return;
      initialLoadDone.current = true;

      const metadata = await getCacheMetadata();
      const cachedData = await getCachedData();

      if (cachedData && metadata) {
        setData(cachedData);
        setLastSynced(getLastSyncedDate(metadata));
        setStatus(getCacheStatus(metadata, false));

        // Auto-refresh if stale
        if (shouldRefreshCache(metadata)) {
          // Don't await - let it sync in background
          void syncCache(false);
        }
      } else {
        setStatus("empty");
        // Initial sync if no cache exists
        void syncCache(false);
      }
    }

    void loadCache();
  }, [syncCache]);

  /**
   * Clear all cached data
   */
  const clear = useCallback(async (): Promise<void> => {
    await clearCache();
    setData(undefined);
    setStatus("empty");
    setLastSynced(undefined);
    setError(undefined);
  }, []);

  return {
    data,
    status,
    lastSynced,
    isLoading,
    error,
    sync: syncCache,
    clear,
  };
}
