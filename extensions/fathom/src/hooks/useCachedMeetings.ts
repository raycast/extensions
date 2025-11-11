import { useCallback, useEffect, useState } from "react";
import type { MeetingFilter, Meeting, ActionItem } from "../types/Types";
import { searchCachedMeetings, type CachedMeetingData } from "../utils/cache";
import { cacheManager } from "../utils/cacheManager";
import { logger } from "@chrismessina/raycast-logger";

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

    logger.log("[useCachedMeetings] Subscribing to cache manager");

    // Subscribe to cache updates
    const unsubscribe = cacheManager.subscribe((meetings) => {
      logger.log(`[useCachedMeetings] Received cache update: ${meetings.length} meetings`);
      setCachedMeetings(meetings);
      setIsLoading(false);
    });

    // Load cache on mount
    (async () => {
      try {
        setIsLoading(true);
        const cached = await cacheManager.loadCache();
        setCachedMeetings(cached);

        // Always check for new meetings on mount to ensure fresh data
        // This ensures new meetings appear even if cache exists
        logger.log(`[useCachedMeetings] Loaded ${cached.length} cached meetings, checking for updates`);
        await cacheManager.fetchAndCache(filter);
      } catch (err) {
        logger.error("[useCachedMeetings] Error loading cache:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    })();

    // Cleanup: unsubscribe on unmount
    return () => {
      logger.log("[useCachedMeetings] Unsubscribing from cache manager");
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
      logger.error("[useCachedMeetings] Error refreshing cache:", error);
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
