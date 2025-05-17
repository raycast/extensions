import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { log, error as logError } from "../utils/logger";
import { WindowDetailsObject, WindowState } from "../types";
import { getActiveWindowInfo } from "../swift-app";
import { CachedItem, createCacheItem, isCacheValid, HOUR_IN_MS } from "../utils/storageUtils";

// Main storage key for all window states
const WINDOW_STATES_STORAGE_KEY = "window-states";
// Cache expiration time (1 hour)
const CACHE_EXPIRATION_TIME_MS = HOUR_IN_MS;

export function useWindowStateManager() {
  // Window states cache using useState
  const [windowStatesCache, setWindowStatesCache] = useState<CachedItem<Record<string, WindowState>> | null>(null);

  // Load all saved window states from storage
  const loadAllWindowStates = useCallback(async (): Promise<Record<string, WindowState>> => {
    try {
      // Return cached data if valid
      if (windowStatesCache && isCacheValid(windowStatesCache, CACHE_EXPIRATION_TIME_MS)) {
        return windowStatesCache.value;
      }

      const data = await LocalStorage.getItem<string>(WINDOW_STATES_STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data) as Record<string, WindowState>;
        // Update cache using the state setter
        setWindowStatesCache(createCacheItem(parsedData));
        return parsedData;
      }
    } catch (err) {
      logError("Error loading window states:", err);
    }

    // Initialize empty cache
    const initialCache = createCacheItem({});
    setWindowStatesCache(initialCache);
    return initialCache.value;
  }, [windowStatesCache]); // Add windowStatesCache to dependencies

  // Save all window states
  const saveAllWindowStates = useCallback(async (states: Record<string, WindowState>): Promise<void> => {
    try {
      // Update cache using the state setter
      setWindowStatesCache(createCacheItem(states));
      // Persist to storage
      await LocalStorage.setItem(WINDOW_STATES_STORAGE_KEY, JSON.stringify(states));
    } catch (err) {
      logError("Error saving window states:", err);
    }
  }, []); // No dependency on windowStatesCache needed here as we are setting it

  // Update a single window state
  const updateSingleWindowState = useCallback(
    async (key: string, state: WindowState): Promise<void> => {
      try {
        // Read current cache value. If null, load it first.
        const currentCacheValue = windowStatesCache?.value ?? (await loadAllWindowStates());

        // Update the specific entry
        const updatedStates = { ...currentCacheValue, [key]: state };
        const newCache = createCacheItem(updatedStates);
        setWindowStatesCache(newCache);

        // Persist to storage
        await LocalStorage.setItem(WINDOW_STATES_STORAGE_KEY, JSON.stringify(updatedStates));
      } catch (err) {
        logError(`Error updating window state for ${key}:`, err);
      }
    },
    // Depends on the current cache and the load function
    [windowStatesCache, loadAllWindowStates],
  );

  // Get current window info using Swift API
  const getCurrentWindowInfo = useCallback(async (): Promise<WindowState | null> => {
    try {
      // Use Swift API to get window details
      const windowDetails = (await getActiveWindowInfo()) as WindowDetailsObject;

      if (windowDetails.error || !windowDetails.app || !windowDetails.window) {
        throw new Error("Failed to get window information");
      }

      // Extract window information
      const processId = String(windowDetails.app.processID);
      // Use encodeURIComponent to handle special characters in app name and underscore as separator
      const windowId = `${encodeURIComponent(windowDetails.app.name)}_${processId}`;
      const size = windowDetails.window.size;
      const position = windowDetails.window.position;

      // Create window state object with size and position information
      return {
        windowId,
        size: {
          width: size.width,
          height: size.height,
        },
        position: {
          x: position.x,
          y: position.y,
        },
        timestamp: Date.now(),
      };
    } catch (err) {
      logError("Error getting window info:", err);
      return null;
    }
  }, []);

  // Save window state
  const saveWindowState = useCallback(async (): Promise<string | null> => {
    try {
      const windowInfo = await getCurrentWindowInfo();
      if (!windowInfo) {
        logError("No active window found");
        return null;
      }

      // Use windowId as key
      const key = windowInfo.windowId;

      // Update single state
      await updateSingleWindowState(key, windowInfo);

      log(`Saved window info: `, windowInfo);
      return key;
    } catch (err) {
      logError("Error saving window state:", err);
      return null;
    }
  }, [getCurrentWindowInfo, updateSingleWindowState]);

  // Clean up expired window states
  const cleanupExpiredStates = useCallback(async (): Promise<void> => {
    try {
      const allStates = await loadAllWindowStates();
      const now = Date.now();
      let hasChanges = false;

      // Remove states older than expiration time
      for (const key in allStates) {
        if (now - allStates[key].timestamp > CACHE_EXPIRATION_TIME_MS) {
          log(`Removing expired window info: ${key}`);
          delete allStates[key];
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await saveAllWindowStates(allStates);
      }
    } catch (err) {
      logError("Error cleaning up expired states:", err);
    }
  }, [loadAllWindowStates, saveAllWindowStates]);

  // Get window state without applying it
  const getWindowState = useCallback(async (): Promise<WindowState | null> => {
    try {
      const windowInfo = await getCurrentWindowInfo();
      if (!windowInfo) {
        logError("No active window found for getting state");
        return null;
      }

      const key = windowInfo.windowId;
      const allStates = await loadAllWindowStates();

      // Check if there's a saved state for this window
      if (allStates[key]) {
        log(`Found state for ${key}`);
        return allStates[key];
      }

      log(`No state found for ${key}`);
      return null;
    } catch (err) {
      logError("Error getting window state:", err);
      return null;
    }
  }, [getCurrentWindowInfo, loadAllWindowStates]);

  // Run cleanup on hook initialization
  useEffect(() => {
    cleanupExpiredStates();
  }, [cleanupExpiredStates]);

  return {
    saveWindowState,
    cleanupExpiredStates,
    getWindowState,
  };
}
