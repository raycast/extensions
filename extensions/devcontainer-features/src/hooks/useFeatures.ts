import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearCache,
  getCachedFeatures,
  getCacheTimestamp,
  setCachedFeatures,
} from "../api/cache";
import { fetchCollectionIndex, sortCollections } from "../api/collection-index";
import { fetchAllFeatures } from "../api/ghcr";
import type { CollectionFetchResult, Feature } from "../types";
import { sortFeatures } from "../utils/collection";
import { getUserErrorMessage } from "../utils/errors";
import { initializePreferences } from "../utils/preferences";
import { throttle } from "../utils/throttle";

interface UseFeaturesResult {
  features: Feature[];
  isLoading: boolean;
  error: string | null;
  progress: { completed: number; total: number } | null;
  cacheTimestamp: Date | null;
  failedCollections: CollectionFetchResult[];
  refresh: () => Promise<void>;
}

export function useFeatures(): UseFeaturesResult {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<Date | null>(null);
  const [failedCollections, setFailedCollections] = useState<
    CollectionFetchResult[]
  >([]);

  // Throttled toast update to avoid too frequent updates
  const throttledToastRef = useRef(
    throttle((completed: number, total: number) => {
      showToast({
        style: Toast.Style.Animated,
        title: "Fetching features...",
        message: `${completed}/${total} collections`,
      });
    }, 500),
  );

  const loadFeatures = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    setProgress(null);
    setFailedCollections([]);

    // Initialize preferences (apply cache TTL, etc.)
    initializePreferences();

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getCachedFeatures();
        if (cached && cached.length > 0) {
          setFeatures(cached);
          setCacheTimestamp(getCacheTimestamp());
          setIsLoading(false);
          return;
        }
      }

      // Clear cache on force refresh
      if (forceRefresh) {
        clearCache();
      }

      // Fetch collection index
      await showToast({
        style: Toast.Style.Animated,
        title: "Loading collections...",
      });

      const collections = await fetchCollectionIndex();
      const sortedCollections = sortCollections(collections);

      // Fetch features from all collections
      await showToast({
        style: Toast.Style.Animated,
        title: "Fetching features...",
        message: `0/${sortedCollections.length} collections`,
      });

      const { features: allFeatures, failedCollections: failed } =
        await fetchAllFeatures(
          sortedCollections,
          undefined,
          (completed, total) => {
            setProgress({ completed, total });
            throttledToastRef.current(completed, total);
          },
        );

      setFailedCollections(failed);

      // Sort features: official first, then alphabetically
      const sortedFeatures = sortFeatures(allFeatures);

      // Cache and update state
      setCachedFeatures(sortedFeatures);
      setFeatures(sortedFeatures);
      setCacheTimestamp(getCacheTimestamp());

      // Show result toast
      if (failed.length > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "Features loaded",
          message: `${sortedFeatures.length} features (${failed.length} collections failed)`,
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Features loaded",
          message: `${sortedFeatures.length} features from ${sortedCollections.length} collections`,
        });
      }
    } catch (err) {
      const userMessage = getUserErrorMessage(err);
      setError(userMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load features",
        message: userMessage,
      });
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadFeatures(true);
  }, [loadFeatures]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  return {
    features,
    isLoading,
    error,
    progress,
    cacheTimestamp,
    failedCollections,
    refresh,
  };
}
