import { useCachedPromise } from "@raycast/utils";
import { getMySavedTracks } from "../api/getMySavedTracks";
import { useCallback, useEffect, useRef } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { MinimalTrack } from "../api/getMySavedTracks";

// Constants
const CACHE_NAMESPACE = "spotify-library";
const LIBRARY_CACHE_KEY = `${CACHE_NAMESPACE}-saved`;
const ITEMS_PER_PAGE = 50;
const CLEANUP_DELAY = 1500;

// Types
type UseMySavedTracksProps = {
  fetchAll?: boolean;
  options?: {
    execute?: boolean;
    keepPreviousData?: boolean;
  };
};

type FetchState = {
  progress: number;
  showProgress: boolean;
  isBackgroundUpdate: boolean;
  backgroundData: MinimalTrack[] | null;
  isFetching: boolean;
};

export function useMySavedTracks({ fetchAll = false, options }: UseMySavedTracksProps = {}) {
  const fetchState = useRef<FetchState>({
    progress: 0,
    showProgress: false,
    isBackgroundUpdate: false,
    backgroundData: null,
    isFetching: false,
  });

  // Memoized fetch function
  const fetchLibrary = useCallback(async () => {
    try {
      const cached = await LocalStorage.getItem<string>(LIBRARY_CACHE_KEY);
      const cachedData = cached ? JSON.parse(cached) : null;
      const quickCheck = await getMySavedTracks({ limit: 1, offset: 0, fetchAll: false });

      // Cache hit with matching totals
      if (cachedData?.items.length === quickCheck.total) {
        fetchState.current.progress = 100;
        return cachedData.items;
      }

      // Stale cache - background update
      if (cachedData) {
        fetchState.current.isBackgroundUpdate = true;
        fetchState.current.isFetching = true;
        backgroundUpdate();
        return cachedData.items;
      }

      // Fresh fetch
      fetchState.current.isFetching = true;
      const result = await freshFetch();
      showCompletionToast(result.length);
      return result;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      if (!fetchState.current.isBackgroundUpdate) {
        cleanupState();
      }
    }
  }, [fetchAll]);

  // Background update helper
  const backgroundUpdate = async () => {
    try {
      const result = await getMySavedTracks({
        limit: ITEMS_PER_PAGE,
        offset: 0,
        fetchAll: true,
        onProgress: updateProgress,
      });

      await LocalStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(result));
      fetchState.current.backgroundData = result.items;
      fetchState.current.progress = 100;
      fetchState.current.isFetching = false;

      showCompletionToast(result.items.length);
      cleanupState();
      revalidate(); // Immediately revalidate after background update
    } catch (error) {
      handleError(error);
      fetchState.current.isFetching = false;
      cleanupState();
    }
  };

  // Fresh fetch helper
  const freshFetch = async () => {
    try {
      const result = await getMySavedTracks({
        limit: ITEMS_PER_PAGE,
        offset: 0,
        fetchAll: true,
        onProgress: updateProgress,
      });

      await LocalStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(result));
      fetchState.current.progress = 100;
      fetchState.current.isFetching = false;
      return result.items;
    } catch (error) {
      fetchState.current.isFetching = false;
      throw error;
    }
  };

  // Progress update helper
  const updateProgress = (progress: number) => {
    // Only update if still fetching (prevents stuck progress)
    if (fetchState.current.isFetching) {
      fetchState.current.progress = progress;
      fetchState.current.showProgress = true;
      showProgressToast(progress);
    }
  };

  // Toast helpers
  const showProgressToast = (progress: number) => {
    if (progress > 0 && fetchState.current.isFetching) {
      showToast({
        style: Toast.Style.Animated,
        title: fetchState.current.isBackgroundUpdate ? "Updating your library..." : "Loading your library...",
        message: `${progress}% complete`,
      });
    }
  };

  const showCompletionToast = (itemCount: number) => {
    showToast({
      style: Toast.Style.Success,
      title: "Library updated",
      message: `${itemCount} items available`,
    });
  };

  // Error handling helper
  const handleError = (error: unknown) => {
    if (error instanceof Error && error.message.includes("429")) {
      showToast({
        style: Toast.Style.Failure,
        title: "Rate limit exceeded",
        message: "Please wait a moment before trying again",
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load library",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Cleanup helper
  const cleanupState = () => {
    setTimeout(() => {
      if (!fetchState.current.isFetching) {
        fetchState.current = {
          ...fetchState.current,
          isBackgroundUpdate: false,
          showProgress: false,
          progress: 0,
          backgroundData: null,
          isFetching: false,
        };
      }
    }, CLEANUP_DELAY);
  };

  const { data, error, isLoading, revalidate } = useCachedPromise(fetchLibrary, [], {
    execute: options?.execute !== false,
    keepPreviousData: true,
  });

  // Background data update effect
  useEffect(() => {
    let mounted = true;

    if (fetchState.current.backgroundData && mounted) {
      fetchState.current.backgroundData = null;
    }

    return () => {
      mounted = false;
    };
  }, [revalidate]);

  return {
    savedTracksData: data ? { items: data, total: data.length } : undefined,
    savedTracksError: error,
    savedTracksIsLoading: isLoading && fetchState.current.showProgress && !fetchState.current.isBackgroundUpdate,
    fetchProgress: isLoading ? fetchState.current.progress : 100,
    revalidate,
  };
}
