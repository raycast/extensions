import { useState, useEffect, useCallback } from "react";
import { CanvasCache } from "./cache";
import { ErrorHandler } from "./error-handling";

export interface DataLoadingState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

export interface DataLoadingOptions<T> {
  cacheKey: string;
  cache: CanvasCache;
  loadFunction: () => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  showCacheToast?: boolean;
  showRefreshToast?: boolean;
}

export function useDataLoading<T>(
  initialData: T,
  options: DataLoadingOptions<T>,
): DataLoadingState<T> & {
  refreshData: () => Promise<void>;
  clearCache: () => void;
} {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { cacheKey, cache, loadFunction, onSuccess, onError, showCacheToast = true, showRefreshToast = true } = options;

  const loadFreshData = useCallback(async (): Promise<T> => {
    const freshData = await loadFunction();
    await cache.set(cacheKey, freshData);
    return freshData;
  }, [cacheKey, cache, loadFunction]);

  const loadData = useCallback(
    async (useCache: boolean = true) => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to load from cache first if enabled
        if (useCache) {
          const cachedData = await cache.get<T>(cacheKey);
          if (cachedData) {
            setData(cachedData);
            setIsLoading(false);

            if (showCacheToast) {
              ErrorHandler.showInfo("Data Loaded", "Showing cached data (refreshing in background)");
            }

            // Refresh in background without calling loadData recursively
            setTimeout(async () => {
              try {
                const freshData = await loadFreshData();
                setData(freshData);
              } catch (error) {
                console.warn("Background refresh failed:", error);
              }
            }, 100);

            return;
          }
        }

        // Load fresh data
        const freshData = await loadFreshData();
        setData(freshData);
        setIsLoading(false);

        if (onSuccess) {
          onSuccess(freshData);
        }
      } catch (err) {
        const errorMessage = ErrorHandler.getErrorMessage(err);
        setError(errorMessage);
        setIsLoading(false);

        if (onError) {
          onError(err);
        } else {
          ErrorHandler.showError(err, "Data Loading");
        }
      }
    },
    [cacheKey, cache, loadFreshData, onSuccess, onError, showCacheToast],
  );

  const refreshData = useCallback(async () => {
    try {
      cache.remove(cacheKey);
      await loadData(false);

      if (showRefreshToast) {
        ErrorHandler.showSuccess("Data Updated", "Fresh data loaded from Canvas");
      }
    } catch (error) {
      console.warn("Background refresh failed:", error);
      // Don't show error to user for background refresh
    }
  }, [cacheKey, cache, loadData, showRefreshToast]);

  const clearCache = useCallback(() => {
    cache.clear();
    ErrorHandler.showSuccess("Cache Cleared", "All cached data has been removed");
  }, [cache]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refreshData,
    clearCache,
  };
}
