import { useCallback, useEffect, useState } from "react";
import type { MeetingFilter, Meeting, ActionItem } from "../types/Types";
import { searchCachedMeetings, type CachedMeetingData } from "../utils/cache";
import { cacheManager } from "../utils/cacheManager";

interface UseCachedMeetingsOptions {
  filter?: MeetingFilter;
  enableCache?: boolean;
}

interface UseCachedMeetingsResult {
  meetings: Meeting[];
  isLoading: boolean;
  error: Error | undefined;
  searchMeetings: (query: string) => Meeting[];
  refreshCache: () => Promise<void>;
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

  const [cachedMeetings, setCachedMeetings] = useState<CachedMeetingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  // Subscribe to cache manager updates
  useEffect(() => {
    if (!enableCache) {
      setIsLoading(false);
      return;
    }

    console.log("[useCachedMeetings] Subscribing to cache manager");

    // Subscribe to cache updates
    const unsubscribe = cacheManager.subscribe((meetings) => {
      console.log(`[useCachedMeetings] Received cache update: ${meetings.length} meetings`);
      setCachedMeetings(meetings);
      setIsLoading(false);
    });

    // Load cache on mount
    (async () => {
      try {
        setIsLoading(true);
        const cached = await cacheManager.loadCache();
        setCachedMeetings(cached);

        // Only fetch from API if cache is empty or stale
        if (cached.length === 0) {
          console.log("[useCachedMeetings] Cache empty, fetching from API");
          await cacheManager.fetchAndCache(filter);
        } else {
          console.log(`[useCachedMeetings] Using cached data (${cached.length} meetings)`);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("[useCachedMeetings] Error loading cache:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    })();

    // Cleanup: unsubscribe on unmount
    return () => {
      console.log("[useCachedMeetings] Unsubscribing from cache manager");
      unsubscribe();
    };
  }, [filter, enableCache]);

  // Convert cached data to Meeting array
  const meetings: Meeting[] = cachedMeetings.map((cached) => {
    const meeting = cached.meeting as Meeting;
    // Update with cached summary/transcript if not already present
    return {
      ...meeting,
      summaryText: meeting.summaryText || cached.summary,
      transcriptText: meeting.transcriptText || cached.transcript,
      // Use cached action items if meeting data doesn't have them or if cache is more recent
      actionItems: meeting.actionItems || (cached.actionItems as ActionItem[] | undefined),
    };
  });

  // Full-text search over cached meetings
  const searchMeetings = useCallback(
    (query: string): Meeting[] => {
      if (!query || query.trim() === "") {
        return meetings;
      }

      const results = searchCachedMeetings(cachedMeetings, query);
      return results.map((cached: CachedMeetingData) => {
        const meeting = cached.meeting as Meeting;
        return {
          ...meeting,
          summaryText: meeting.summaryText || cached.summary,
          transcriptText: meeting.transcriptText || cached.transcript,
          actionItems: meeting.actionItems || (cached.actionItems as ActionItem[] | undefined),
        };
      });
    },
    [cachedMeetings, meetings],
  );

  // Refresh cache by fetching from API
  const refreshCache = useCallback(async () => {
    if (!enableCache) return;

    try {
      await cacheManager.refreshCache(filter);
    } catch (error) {
      console.error("[useCachedMeetings] Error refreshing cache:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [enableCache, filter]);

  return {
    meetings,
    isLoading,
    error,
    searchMeetings,
    refreshCache,
  };
}
