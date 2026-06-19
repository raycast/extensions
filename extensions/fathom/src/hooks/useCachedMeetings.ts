import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MeetingFilter, Meeting, ActionItem } from "../types/Types";
import { searchCachedMeetings, type CachedMeetingData } from "../utils/cache";
import { cacheManager } from "../utils/cacheManager";
import { resetApiKeyValidation } from "../fathom/auth";
import { logger } from "@chrismessina/raycast-logger";

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

interface UseCachedMeetingsOptions {
  filter?: MeetingFilter;
  enableCache?: boolean;
}

interface UseCachedMeetingsResult {
  meetings: Meeting[];
  isLoading: boolean;
  isFetchingBackground: boolean;
  error: Error | undefined;
  searchMeetings: (query: string) => Meeting[];
  refreshCache: () => Promise<void>;
  stopFetch: () => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

/**
 * Hook to manage cached meetings with full-text search
 *
 * Features:
 * - Automatically caches meetings with summaries and transcripts
 * - Provides full-text search over titles, summaries, and transcripts
 * - Smart cache management with automatic pruning
 * - Falls back to API when cache is empty
 */
export function useCachedMeetings(options: UseCachedMeetingsOptions = {}): UseCachedMeetingsResult {
  const { filter = {}, enableCache = true } = options;

  // Stabilize filter reference to prevent useEffect re-runs on every render.
  // Object literals like `{}` create a new reference each render, causing infinite loops.
  const filterKey = JSON.stringify(filter);
  const stableFilter = useMemo(() => filter, [filterKey]);
  const filterRef = useRef(stableFilter);
  filterRef.current = stableFilter;

  const [cachedMeetings, setCachedMeetings] = useState<CachedMeetingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingBackground, setIsFetchingBackground] = useState(() => cacheManager.isFetchingBackground());
  const [error, setError] = useState<Error | undefined>();
  const [hasMore, setHasMore] = useState(() => cacheManager.hasMore());
  const isLoadingMoreRef = useRef(false);

  // Subscribe to cache manager updates
  useEffect(() => {
    if (!enableCache) {
      setIsLoading(false);
      setHasMore(false);
      return;
    }

    let cancelled = false;

    // Reset API key validation so a previously-invalid key doesn't block
    // fresh attempts after the user updates their key in preferences
    resetApiKeyValidation();
    setError(undefined);

    logger.log("[useCachedMeetings] Subscribing to cache manager");

    // Subscribe to cache updates
    const unsubscribe = cacheManager.subscribe((meetings) => {
      if (cancelled) return;
      logger.log(`[useCachedMeetings] Received cache update: ${meetings.length} meetings`);
      setCachedMeetings(meetings);
      setIsLoading(false);
    });

    // Subscribe to background fetch state
    const unsubscribeFetching = cacheManager.subscribeFetching((fetching) => {
      if (cancelled) return;
      setIsFetchingBackground(fetching);
    });

    // Load cache on mount
    (async () => {
      try {
        setIsLoading(true);
        const cached = await cacheManager.loadCache();
        if (cancelled) return;
        setCachedMeetings(cached);

        const cacheAge = cacheManager.getCacheAgeMinutes();

        // Only fetch fresh data if cache is stale (>5 min old)
        // This avoids the "Loading..." toast on every launch
        if (cacheManager.isCacheStale()) {
          logger.log(`[useCachedMeetings] Cache is stale (${cacheAge} min old), fetching fresh data`);
          await cacheManager.fetchAndCache(filterRef.current, { force: true });
        } else {
          logger.log(`[useCachedMeetings] Using fresh cache (${cacheAge} min old), skipping API fetch`);
        }

        setHasMore(cacheManager.hasMore());
      } catch (err) {
        if (cancelled) return;
        logger.error("[useCachedMeetings] Error loading cache:", err);
        setError(toError(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Cleanup: unsubscribe on unmount and prevent stale state updates
    return () => {
      cancelled = true;
      logger.log("[useCachedMeetings] Unsubscribing from cache manager");
      unsubscribe();
      unsubscribeFetching();
    };
  }, [filterKey, enableCache]);

  const toMeeting = (cached: CachedMeetingData): Meeting => {
    const meeting = cached.meeting as Meeting;
    return {
      ...meeting,
      summaryText: meeting.summaryText || cached.summary,
      transcriptText: meeting.transcriptText || cached.transcript,
      actionItems: meeting.actionItems || (cached.actionItems as ActionItem[] | undefined),
    };
  };

  // Convert cached data to Meeting array
  const meetings: Meeting[] = cachedMeetings.map(toMeeting);

  // Full-text search over cached meetings
  const searchMeetings = useCallback(
    (query: string): Meeting[] => {
      if (!query || query.trim() === "") return cachedMeetings.map(toMeeting);
      return searchCachedMeetings(cachedMeetings, query).map(toMeeting);
    },
    [cachedMeetings],
  );

  // Refresh cache by fetching from API
  const refreshCache = useCallback(async () => {
    if (!enableCache) return;

    try {
      await cacheManager.refreshCache(filterRef.current);
      setHasMore(cacheManager.hasMore());
    } catch (error) {
      logger.error("[useCachedMeetings] Error refreshing cache:", error);
      setError(toError(error));
    }
  }, [enableCache]);

  // Load more meetings (incremental pagination)
  const loadMore = useCallback(async () => {
    if (!enableCache || isLoadingMoreRef.current) return;

    try {
      isLoadingMoreRef.current = true;
      await cacheManager.loadMoreMeetings(filterRef.current);
      setHasMore(cacheManager.hasMore());
    } catch (error) {
      logger.error("[useCachedMeetings] Error loading more meetings:", error);
      setError(toError(error));
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [enableCache]);

  const stopFetch = useCallback(() => {
    cacheManager.stopBackgroundFetch();
  }, []);

  return {
    meetings,
    isLoading,
    isFetchingBackground,
    error,
    searchMeetings,
    refreshCache,
    stopFetch,
    loadMore,
    hasMore,
  };
}
