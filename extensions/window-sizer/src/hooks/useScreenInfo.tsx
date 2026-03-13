import { useState, useCallback, useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ScreenInfo } from "../types";
import { CachedItem, createCacheItem, isCacheValid, HOUR_IN_MS } from "../utils/storageUtils";
import { getScreensInfo, getActiveWindowScreenInfo } from "../swift-app";
import { log, error as logError } from "../utils/logger";

// Cache keys
const SCREENS_INFO_CACHE_KEY = "screens-info-cache";
const CACHE_DURATION = HOUR_IN_MS * 24; // 24 hours cache duration

// Track initialization status to prevent duplicate calls and logs
let isInitialized = false;

/**
 * Hook for getting screen information using Swift API
 */
export function useScreenInfo() {
  const [screens, setScreens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [cachedScreens, setCachedScreens] = useState<CachedItem<string[]> | null>(null);

  /**
   * Load cache from persistent storage
   */
  const loadCacheFromStorage = useCallback(async () => {
    try {
      // Load screens info cache
      const storedScreens = await LocalStorage.getItem<string>(SCREENS_INFO_CACHE_KEY);
      if (storedScreens) {
        const parsedCache = JSON.parse(storedScreens) as CachedItem<string[]>;
        setCachedScreens(parsedCache);
        setScreens(parsedCache.value);
      }
    } catch (err) {
      logError("Error loading cache from storage:", err);
    }
  }, []);

  /**
   * Clear all screen information cache
   */
  const clearCache = useCallback(async () => {
    try {
      await LocalStorage.removeItem(SCREENS_INFO_CACHE_KEY);
      setCachedScreens(null);
      log("All caches cleared");
      return true;
    } catch (err) {
      logError("Error clearing cache:", err);
      return false;
    }
  }, []);

  /**
   * Get all screen information using Swift
   */
  const getAllScreensInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if cache is valid for 24 hours
      if (cachedScreens && isCacheValid(cachedScreens, CACHE_DURATION)) {
        setScreens(cachedScreens.value);
        return cachedScreens.value;
      }

      // Get screen info via Swift
      const screenInfoList = await getScreensInfo();
      setScreens(screenInfoList);

      // Update cache
      const newCache = createCacheItem(screenInfoList);
      setCachedScreens(newCache);
      await LocalStorage.setItem(SCREENS_INFO_CACHE_KEY, JSON.stringify(newCache));

      return screenInfoList;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(new Error(errorMsg));
      await showFailureToast(errorMsg, { title: "Failed to get screens info" });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [cachedScreens]);

  /**
   * Get the screen information and dimensions of the currently active window
   * @returns ScreenInfo object with width, height, screen index and origin coordinates
   */
  const getActiveWindowScreen = useCallback(async (): Promise<ScreenInfo> => {
    setIsLoading(true);
    setError(null);

    try {
      // Always get fresh data from Swift API
      const windowScreenInfo = await getActiveWindowScreenInfo();
      log("Active window screen info:", windowScreenInfo);

      if (!windowScreenInfo) {
        throw new Error("Active window screen info is empty after fetching");
      }

      // Handle error messages
      if (
        windowScreenInfo.startsWith("Error:") ||
        windowScreenInfo === "Active window not matched to any screen." ||
        windowScreenInfo === "Can't get the active window info" ||
        windowScreenInfo === "Unable to get active window information"
      ) {
        throw new Error(`Failed to get screen information: ${windowScreenInfo}`);
      }

      // Fast parsing of "screenIndex:x,y,width,height" format
      const [indexStr, valuesStr] = windowScreenInfo.split(":");

      if (!indexStr || !valuesStr) {
        throw new Error("Invalid format: missing index or values part");
      }

      const screenIndex = parseInt(indexStr, 10);
      const [xStr, yStr, widthStr, heightStr] = valuesStr.split(",");

      if (!xStr || !yStr || !widthStr || !heightStr) {
        throw new Error("Invalid format: missing coordinate or dimension values");
      }

      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      const width = parseInt(widthStr, 10);
      const height = parseInt(heightStr, 10);

      if (isNaN(screenIndex) || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
        throw new Error("Failed to parse screen information values as numbers");
      }

      return { index: screenIndex, x, y, width, height };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(new Error(errorMsg));
      await showFailureToast(errorMsg, { title: "Failed to get active window screen info" });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh all screen information
   */
  const refreshScreenInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await getAllScreensInfo();
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(new Error(errorMsg));
      await showFailureToast(errorMsg, { title: "Failed to refresh screens info" });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getAllScreensInfo]);

  // Additional functionality for developer mode

  // Detect development mode
  const detectDevMode = useCallback(() => {
    // Check if we're running in development mode
    const isDevMode = process.env.NODE_ENV === "development";
    log("Raycast dev mode:", isDevMode);
    setIsDevMode(isDevMode);
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      log("Initializing screen information");

      // Load cache and detect dev mode
      loadCacheFromStorage();
      detectDevMode();

      // Only preload screen info in dev mode, with cleanup
      if (process.env.NODE_ENV === "development") {
        let mounted = true;
        getAllScreensInfo().then(() => {
          if (mounted) {
            isInitialized = true;
            log("Screen information initialized, cache valid for 24 hours");
          }
        });
        // Cleanup function to set mounted flag to false on unmount
        return () => {
          mounted = false;
        };
      } else {
        // In non-dev environments, mark as initialized immediately
        isInitialized = true;
      }
    }
    // No return needed for the 'else' case or if already initialized
  }, [getAllScreensInfo, loadCacheFromStorage, detectDevMode]);

  return {
    screens,
    isLoading,
    error,
    refreshScreenInfo,
    getAllScreensInfo,
    getActiveWindowScreen,
    clearCache,
    isDevMode,
  };
}
