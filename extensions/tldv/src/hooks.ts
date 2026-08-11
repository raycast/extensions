import { useState, useEffect, useCallback, useMemo } from "react";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import {
  Meeting,
  TranscriptResponse,
  HighlightsResponse,
  Workspace,
  DateFilter,
} from "./types";
import { fetchMeetings, fetchMeetingDetails, getErrorMessage } from "./api";
import {
  getCachedMeetings,
  setCachedMeetings,
  getCachedTranscript,
  setCachedTranscript,
  getCachedHighlights,
  setCachedHighlights,
  DEFAULT_DETAIL_CACHE_TTL,
  clearWorkspaceCache,
} from "./cache";
import {
  parseWorkspaces,
  getDefaultWorkspace,
  filterMeetingsByDate,
  searchMeetings,
  groupMeetingsByDate,
  getPageSize,
  getCacheTTL,
  isOnline,
} from "./utils";

// Hook return types
interface UseMeetingsResult {
  meetings: Meeting[];
  groupedMeetings: Map<string, Meeting[]>;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  clearCache: () => void;
}

interface UseMeetingDetailResult {
  transcript: TranscriptResponse | null;
  highlights: HighlightsResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseWorkspacesResult {
  workspaces: Workspace[];
  currentWorkspace: Workspace | undefined;
  setCurrentWorkspace: (workspace: Workspace) => void;
}

interface UseFilteredMeetingsResult {
  filteredMeetings: Meeting[];
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

// Get preferences
export function usePreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

// Workspaces hook
export function useWorkspaces(): UseWorkspacesResult {
  const prefs = usePreferences();
  const workspaces = useMemo(() => parseWorkspaces(prefs), [prefs]);
  const [currentWorkspace, setCurrentWorkspace] = useState<
    Workspace | undefined
  >(() => getDefaultWorkspace(workspaces, prefs.defaultWorkspace));

  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [workspaces, currentWorkspace]);

  return { workspaces, currentWorkspace, setCurrentWorkspace };
}

// Meetings hook
export function useMeetings(
  workspace: Workspace | undefined,
): UseMeetingsResult {
  const prefs = usePreferences();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const pageSize = useMemo(() => getPageSize(prefs), [prefs]);
  const cacheTTL = useMemo(() => getCacheTTL(prefs) * 60 * 1000, [prefs]);
  const useMockData = prefs.useMockData === true;
  const cacheKey = useMockData ? "mock" : workspace?.name || "default";

  const loadMeetings = useCallback(
    async (page = 1, append = false, forceRefresh = false) => {
      if (!workspace && !useMockData) {
        setIsLoading(false);
        return;
      }

      setError(null);

      // Check cache for first page (skip for mock mode)
      if (page === 1 && !append && !forceRefresh && !useMockData) {
        const cached = getCachedMeetings<{
          meetings: Meeting[];
          pages: number;
        }>(cacheKey, cacheTTL);
        if (cached) {
          setMeetings(cached.meetings);
          setTotalPages(cached.pages);
          setHasMore(1 < cached.pages);
          setCurrentPage(1);
          setIsLoading(false);
          return;
        }
      }

      // Check online status (skip for mock mode)
      if (!useMockData && !isOnline()) {
        const cached = getCachedMeetings<{
          meetings: Meeting[];
          pages: number;
        }>(cacheKey, Infinity);
        if (cached) {
          setMeetings(cached.meetings);
          setTotalPages(cached.pages);
          setHasMore(false);
          setIsLoading(false);
          showToast({
            style: Toast.Style.Failure,
            title: "Offline",
            message: "Showing cached data",
          });
          return;
        }
        setError("No internet connection");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const data = await fetchMeetings(
          workspace?.apiKey || "",
          page,
          pageSize,
          useMockData,
        );

        if (append) {
          setMeetings((prev) => [...prev, ...data.results]);
        } else {
          setMeetings(data.results);
          if (!useMockData) {
            setCachedMeetings(cacheKey, {
              meetings: data.results,
              pages: data.pages,
            });
          }
        }

        setCurrentPage(page);
        setTotalPages(data.pages);
        setHasMore(page < data.pages);

        if (useMockData) {
          showToast({
            style: Toast.Style.Success,
            title: "Mock Mode",
            message: "Displaying sample data",
          });
        }
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);

        // Fallback to cache
        const cached = getCachedMeetings<{
          meetings: Meeting[];
          pages: number;
        }>(cacheKey, Infinity);
        if (cached) {
          setMeetings(cached.meetings);
          setTotalPages(cached.pages);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch (showing cached)",
            message,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch meetings",
            message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [workspace, cacheKey, pageSize, cacheTTL, useMockData],
  );

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await loadMeetings(currentPage + 1, true);
    }
  }, [hasMore, isLoading, currentPage, loadMeetings]);

  const refresh = useCallback(async () => {
    setCurrentPage(1);
    await loadMeetings(1, false, true);
  }, [loadMeetings]);

  const clearCacheAction = useCallback(() => {
    clearWorkspaceCache(cacheKey);
    showToast({
      style: Toast.Style.Success,
      title: "Cache cleared",
    });
  }, [cacheKey]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const groupedMeetings = useMemo(
    () => groupMeetingsByDate(meetings),
    [meetings],
  );

  return {
    meetings,
    groupedMeetings,
    isLoading,
    error,
    hasMore,
    currentPage,
    totalPages,
    loadMore,
    refresh,
    clearCache: clearCacheAction,
  };
}

// Meeting detail hook
export function useMeetingDetail(
  meetingId: string,
  apiKey: string,
): UseMeetingDetailResult {
  const prefs = usePreferences();
  const useMockData = prefs.useMockData === true;
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [highlights, setHighlights] = useState<HighlightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(
    async (forceRefresh = false) => {
      setError(null);

      // Check cache (skip for mock mode)
      if (!forceRefresh && !useMockData) {
        const cachedTranscript = getCachedTranscript<TranscriptResponse>(
          meetingId,
          DEFAULT_DETAIL_CACHE_TTL,
        );
        const cachedHighlights = getCachedHighlights<HighlightsResponse>(
          meetingId,
          DEFAULT_DETAIL_CACHE_TTL,
        );

        if (cachedTranscript !== null) setTranscript(cachedTranscript);
        if (cachedHighlights !== null) setHighlights(cachedHighlights);

        if (cachedTranscript !== null && cachedHighlights !== null) {
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);

      try {
        const details = await fetchMeetingDetails(
          apiKey,
          meetingId,
          useMockData,
        );

        if (details.transcript) {
          if (!useMockData) {
            setCachedTranscript(meetingId, details.transcript);
          }
          setTranscript(details.transcript);
        }

        if (details.highlights) {
          if (!useMockData) {
            setCachedHighlights(meetingId, details.highlights);
          }
          setHighlights(details.highlights);
        }
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load details",
          message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [meetingId, apiKey, useMockData],
  );

  const refresh = useCallback(async () => {
    await loadDetails(true);
  }, [loadDetails]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  return { transcript, highlights, isLoading, error, refresh };
}

// Filtered meetings hook
export function useFilteredMeetings(
  meetings: Meeting[],
): UseFilteredMeetingsResult {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMeetings = useMemo(() => {
    let result = meetings;
    result = filterMeetingsByDate(result, dateFilter);
    result = searchMeetings(result, searchQuery);
    return result;
  }, [meetings, dateFilter, searchQuery]);

  return {
    filteredMeetings,
    dateFilter,
    setDateFilter,
    searchQuery,
    setSearchQuery,
  };
}

// Recent meetings hook (for menu bar)
export function useRecentMeetings(
  workspace: Workspace | undefined,
  limit = 5,
): {
  meetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { meetings, isLoading, error, refresh } = useMeetings(workspace);

  const recentMeetings = useMemo(
    () => meetings.slice(0, limit),
    [meetings, limit],
  );

  return { meetings: recentMeetings, isLoading, error, refresh };
}
