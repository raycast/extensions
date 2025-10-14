import { useCallback, useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listMeetings } from "../fathom/api";
import type { MeetingFilter, Meeting, ActionItem } from "../types/Types";
import {
  cacheMeeting,
  getAllCachedMeetings,
  pruneCache,
  searchCachedMeetings,
  type CachedMeetingData,
} from "../utils/cache";

const CACHE_SIZE = 50; // Keep most recent 50 meetings

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
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);

  // Load meetings from API (with summaries and transcripts included)
  const {
    data: apiMeetingsData,
    isLoading: isApiLoading,
    error: apiError,
    mutate: refreshApi,
  } = useCachedPromise(
    async (currentFilter: MeetingFilter) => {
      console.log("[API] Fetching meetings from API with filter:", currentFilter);
      const result = await listMeetings(currentFilter);
      console.log(`[API] Received ${result.items.length} meetings from API`);
      return result;
    },
    [filter],
    {
      keepPreviousData: false,
      execute: enableCache, // Only fetch from API if caching is enabled
    },
  );

  // Load cached meetings on mount
  useEffect(() => {
    if (!enableCache) {
      console.log("[Cache] Cache disabled, skipping load");
      setIsCacheLoaded(true);
      return;
    }

    (async () => {
      try {
        console.log("[Cache] Loading cached meetings from storage...");
        const cached = await getAllCachedMeetings();
        console.log(`[Cache] Loaded ${cached.length} cached meetings`);
        setCachedMeetings(cached);
        setIsCacheLoaded(true);
      } catch (error) {
        console.error("[Cache] Error loading cached meetings:", error);
        setIsCacheLoaded(true);
      }
    })();
  }, [enableCache]);

  // Cache new meetings when API data arrives
  useEffect(() => {
    console.log("[Cache] Cache effect triggered", {
      enableCache,
      hasApiData: !!apiMeetingsData?.items,
      apiDataCount: apiMeetingsData?.items?.length || 0,
      isCacheLoaded,
      cachedCount: cachedMeetings.length,
    });

    if (!enableCache || !apiMeetingsData?.items || !isCacheLoaded) {
      console.log("[Cache] Skipping cache effect - conditions not met");
      return;
    }

    (async () => {
      const meetings = apiMeetingsData.items;
      const totalMeetings = meetings.length;

      console.log(`[Cache] Processing ${totalMeetings} meetings from API`);

      // Only show progress toast if cache was empty and we have meetings to cache
      const shouldShowProgress = cachedMeetings.length === 0 && totalMeetings > 0;
      console.log(
        `[Cache] Should show progress toast: ${shouldShowProgress} (cache empty: ${cachedMeetings.length === 0})`,
      );

      let progressToast: Toast | undefined;

      try {
        if (shouldShowProgress) {
          console.log("[Cache] Creating progress toast...");
          progressToast = await showToast({
            style: Toast.Style.Animated,
            title: `Caching 1 of ${totalMeetings} meetings`,
          });
          console.log("[Cache] Progress toast created");
        }

        // Cache each meeting with its embedded summary and transcript
        for (let i = 0; i < meetings.length; i++) {
          const meeting = meetings[i];

          await cacheMeeting(
            meeting.recordingId,
            meeting,
            meeting.summaryText,
            meeting.transcriptText,
            meeting.actionItems,
          );

          // Update progress toast
          if (progressToast) {
            const current = i + 1;
            progressToast.title = `Caching ${current} of ${totalMeetings} meetings`;
          }
        }

        console.log(`[Cache] Finished caching ${totalMeetings} meetings`);

        // Prune old entries to maintain cache size
        await pruneCache(CACHE_SIZE);

        // Reload cached meetings
        const cached = await getAllCachedMeetings();
        console.log(`[Cache] Reloaded cache, now have ${cached.length} meetings`);
        setCachedMeetings(cached);

        // Show success toast
        if (progressToast) {
          progressToast.style = Toast.Style.Success;
          progressToast.title = `Cached ${totalMeetings} meetings`;
          progressToast.message = "Full-text search now available";
          console.log("[Cache] Updated toast to success");
        }
      } catch (error) {
        console.error("[Cache] Error caching meetings:", error);

        if (progressToast) {
          progressToast.style = Toast.Style.Failure;
          progressToast.title = "Failed to cache meetings";
          progressToast.message = error instanceof Error ? error.message : String(error);
        }
      }
    })();
  }, [apiMeetingsData, enableCache, isCacheLoaded, cachedMeetings.length]);

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
      await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing meetings...",
      });

      await refreshApi();

      await showToast({
        style: Toast.Style.Success,
        title: "Meetings refreshed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh meetings",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [enableCache, refreshApi]);

  const isLoading = !isCacheLoaded || (isApiLoading && cachedMeetings.length === 0);

  return {
    meetings,
    isLoading,
    error: apiError,
    searchMeetings,
    refreshCache,
  };
}
