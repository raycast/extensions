import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState, useRef } from "react";
import { log, error as logError } from "../utils/logger";
import { WindowDetailsObject, WindowState } from "../types";
import { getActiveWindowInfo } from "../swift-app";
import { CachedItem, createCacheItem, isCacheValid, HOUR_IN_MS } from "../utils/storageUtils";

// Main storage key for all window states
const WINDOW_STATES_STORAGE_KEY = "window-states";
// Cache expiration time (1 hour)
const CACHE_EXPIRATION_TIME_MS = HOUR_IN_MS;
// Maximum number of states to keep in storage
const MAX_STATES_COUNT = 50;

export function useWindowStateManager() {
  // Window states cache using useState
  const [windowStatesCache, setWindowStatesCache] = useState<CachedItem<Record<string, WindowState>> | null>(null);
  // Use refs to track mounted state and pending operations
  const isMounted = useRef(true);
  const pendingOperations = useRef<AbortController[]>([]);

  // Safe state update function
  const safeSetWindowStatesCache = useCallback((value: CachedItem<Record<string, WindowState>> | null) => {
    if (isMounted.current) {
      setWindowStatesCache(value);
    }
  }, []);

  // Create abort controller for async operations
  const createOperation = useCallback(() => {
    const controller = new AbortController();
    // Only abort operations when component is unmounted
    if (!isMounted.current) {
      controller.abort();
    } else {
      pendingOperations.current.push(controller);
    }
    return controller;
  }, []);

  // Remove operation from pending list
  const removeOperation = useCallback((controller: AbortController) => {
    // Only remove after operation is completed
    if (!controller.signal.aborted) {
      pendingOperations.current = pendingOperations.current.filter((c) => c !== controller);
    }
  }, []);

  // Load all saved window states from storage
  const loadAllWindowStates = useCallback(async (): Promise<Record<string, WindowState>> => {
    const controller = createOperation();
    try {
      // Return cached data if valid
      if (windowStatesCache && isCacheValid(windowStatesCache, CACHE_EXPIRATION_TIME_MS)) {
        removeOperation(controller);
        return windowStatesCache.value;
      }

      if (controller.signal.aborted) {
        throw new Error("Operation aborted");
      }

      const data = await LocalStorage.getItem<string>(WINDOW_STATES_STORAGE_KEY);
      if (data && !controller.signal.aborted) {
        const parsedData = JSON.parse(data) as Record<string, WindowState>;
        // Update cache using the safe setter
        safeSetWindowStatesCache(createCacheItem(parsedData));
        removeOperation(controller);
        return parsedData;
      }
    } catch (err) {
      if (err instanceof Error && err.message === "Operation aborted") {
        log("Load operation aborted");
      } else {
        logError("Error loading window states:", err);
      }
    }

    // Initialize empty cache
    if (!controller.signal.aborted) {
      const initialCache = createCacheItem({});
      safeSetWindowStatesCache(initialCache);
      removeOperation(controller);
      return initialCache.value;
    }

    removeOperation(controller);
    return {};
  }, [windowStatesCache, createOperation, removeOperation, safeSetWindowStatesCache]);

  // Save all window states
  const saveAllWindowStates = useCallback(
    async (states: Record<string, WindowState>): Promise<void> => {
      const controller = createOperation();
      try {
        if (controller.signal.aborted) return;

        // Update cache using the safe setter
        safeSetWindowStatesCache(createCacheItem(states));

        // Persist to storage
        await LocalStorage.setItem(WINDOW_STATES_STORAGE_KEY, JSON.stringify(states));
      } catch (err) {
        logError("Error saving window states:", err);
      } finally {
        removeOperation(controller);
      }
    },
    [createOperation, removeOperation, safeSetWindowStatesCache],
  );

  // Limit the number of states to MAX_STATES_COUNT
  const limitStatesCount = useCallback(
    async (states: Record<string, WindowState>): Promise<Record<string, WindowState>> => {
      // If we're under the limit, no need to do anything
      if (Object.keys(states).length <= MAX_STATES_COUNT) {
        return states;
      }

      // Sort entries by timestamp (oldest first)
      const sortedEntries = Object.entries(states).sort(([, a], [, b]) => a.timestamp - b.timestamp);

      // Keep only the most recent MAX_STATES_COUNT entries
      const entriesToKeep = sortedEntries.slice(-MAX_STATES_COUNT);
      const limitedStates = Object.fromEntries(entriesToKeep);

      log(`Limited window states from ${sortedEntries.length} to ${entriesToKeep.length}`);
      return limitedStates;
    },
    [],
  );

  // Update a single window state
  const updateSingleWindowState = useCallback(
    async (key: string, state: WindowState): Promise<boolean> => {
      const controller = createOperation();
      try {
        if (controller.signal.aborted) return false;

        // Read current cache value. If null, load it first.
        const currentCacheValue = windowStatesCache?.value ?? (await loadAllWindowStates());

        if (controller.signal.aborted) return false;

        // Update the specific entry
        const updatedStates = { ...currentCacheValue, [key]: state };

        // Limit the number of states
        const limitedStates = await limitStatesCount(updatedStates);

        if (controller.signal.aborted) return false;

        // First persist to storage
        try {
          await LocalStorage.setItem(WINDOW_STATES_STORAGE_KEY, JSON.stringify(limitedStates));

          // Only update cache after storage is confirmed
          const newCache = createCacheItem(limitedStates);
          safeSetWindowStatesCache(newCache);

          return true;
        } catch (storageError) {
          logError(`Error persisting window state for ${key}:`, storageError);
          return false;
        }
      } catch (err) {
        logError(`Error updating window state for ${key}:`, err);
        return false;
      } finally {
        removeOperation(controller);
      }
    },
    [
      windowStatesCache,
      loadAllWindowStates,
      safeSetWindowStatesCache,
      limitStatesCount,
      createOperation,
      removeOperation,
    ],
  );

  // Get current window info using Swift API
  const getCurrentWindowInfo = useCallback(async (): Promise<WindowState | null> => {
    const controller = createOperation();
    try {
      if (controller.signal.aborted) return null;

      // Use Swift API to get window details
      const windowDetails = (await getActiveWindowInfo()) as WindowDetailsObject;

      if (controller.signal.aborted) return null;

      if (windowDetails.error || !windowDetails.app || !windowDetails.window) {
        throw new Error("Failed to get window information");
      }

      // Extract window information
      const processId = String(windowDetails.app.processID);
      const size = windowDetails.window.size;
      const position = windowDetails.window.position;

      // Create unique identifier using app name, process ID and window number
      const windowId = windowDetails.windowRefID
        ? `${encodeURIComponent(windowDetails.app.name)}_${processId}_${windowDetails.windowRefID}`
        : `${encodeURIComponent(windowDetails.app.name)}_${processId}`;

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
    } finally {
      removeOperation(controller);
    }
  }, [createOperation, removeOperation]);

  // Save window state
  const saveWindowState = useCallback(async (): Promise<boolean> => {
    const controller = createOperation();
    try {
      if (controller.signal.aborted) return false;

      const windowInfo = await getCurrentWindowInfo();

      if (controller.signal.aborted) return false;

      if (!windowInfo) {
        logError("No active window found");
        return false;
      }

      // Use windowId as key
      const key = windowInfo.windowId;

      // Update single state and check if it was successful
      const saved = await updateSingleWindowState(key, windowInfo);

      // Log if the save was successful
      if (saved) {
        log(`Saved window info: `, windowInfo);
      }

      return saved; // Return the actual status of the save operation
    } catch (err) {
      logError("Error saving window state:", err);
      return false;
    } finally {
      removeOperation(controller);
    }
  }, [getCurrentWindowInfo, updateSingleWindowState, createOperation, removeOperation]);

  // Clean up expired window states
  const cleanupExpiredStates = useCallback(async (): Promise<void> => {
    const controller = createOperation();
    try {
      if (controller.signal.aborted) return;

      const allStates = await loadAllWindowStates();

      if (controller.signal.aborted) return;

      const now = Date.now();
      let hasChanges = false;

      // Remove states older than expiration time
      const updatedStates = { ...allStates };
      for (const key in updatedStates) {
        if (now - updatedStates[key].timestamp > CACHE_EXPIRATION_TIME_MS) {
          log(`Removing expired window info: ${key}`);
          delete updatedStates[key];
          hasChanges = true;
        }
      }

      if (hasChanges && !controller.signal.aborted) {
        await saveAllWindowStates(updatedStates);
      }
    } catch (err) {
      logError("Error cleaning up expired states:", err);
    } finally {
      removeOperation(controller);
    }
  }, [loadAllWindowStates, saveAllWindowStates, createOperation, removeOperation]);

  // Get window state without applying it
  const getWindowState = useCallback(async (): Promise<WindowState | null> => {
    const controller = createOperation();
    try {
      if (controller.signal.aborted) return null;

      const windowInfo = await getCurrentWindowInfo();

      if (controller.signal.aborted) return null;

      if (!windowInfo) {
        logError("No active window found for getting state");
        return null;
      }

      const key = windowInfo.windowId;
      const allStates = await loadAllWindowStates();

      if (controller.signal.aborted) return null;

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
    } finally {
      removeOperation(controller);
    }
  }, [getCurrentWindowInfo, loadAllWindowStates, createOperation, removeOperation]);

  // Run cleanup on hook initialization and periodically
  useEffect(() => {
    // Mark component as mounted
    isMounted.current = true;

    // Initial cleanup
    cleanupExpiredStates();

    // Set up periodic cleanup every 1 hour
    const cleanupInterval = setInterval(() => {
      cleanupExpiredStates();
    }, HOUR_IN_MS);

    // Cleanup function to prevent memory leaks
    return () => {
      // Mark component as unmounted
      isMounted.current = false;

      // Clear interval
      clearInterval(cleanupInterval);

      // Abort any pending operations
      pendingOperations.current.forEach((controller) => {
        controller.abort();
      });
      pendingOperations.current = [];
    };
  }, [cleanupExpiredStates]);

  return {
    saveWindowState,
    cleanupExpiredStates,
    getWindowState,
    createOperation,
  };
}
