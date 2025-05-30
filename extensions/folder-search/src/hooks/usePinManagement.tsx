import { useState, useCallback, useRef, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import { usePinStorage } from "./usePinStorage";
import { SpotlightSearchResult } from "../types";
import { log } from "../utils";

type PinManagementDependencies = {
  searchScope?: string;
  isShowingDetail?: boolean;
  showNonCloudLibraryPaths?: boolean;
};

/**
 * Hook that manages pin-related functionality
 */
export function usePinManagement({
  searchScope = "",
  isShowingDetail = true,
  showNonCloudLibraryPaths = false,
}: PinManagementDependencies = {}) {
  const [pinnedResults, setPinnedResults] = useState<SpotlightSearchResult[]>([]);
  const [hasCheckedPins, setHasCheckedPins] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  // Keep track of pending state updates
  const pendingPinUpdateRef = useRef<boolean>(false);
  // Track if we've done the initial load
  const hasInitialLoadRef = useRef<boolean>(false);

  const pinStorage = usePinStorage();

  // Initial load of pins
  useEffect(() => {
    const loadPinsFromStorage = async () => {
      try {
        const pins = await pinStorage.loadPins();
        setPinnedResults(pins);
        setHasCheckedPins(true);
        hasInitialLoadRef.current = true;
      } catch (error) {
        log("error", "usePinManagement", "Error loading pins", {
          error: error instanceof Error ? error.message : String(error),
        });
        showFailureToast({ title: "Could not load pinned folders" });
        setHasCheckedPins(true);
        hasInitialLoadRef.current = true;
      }
    };

    loadPinsFromStorage();
  }, []);

  // Save pins when they change (but not on initial load)
  useEffect(() => {
    if (!hasCheckedPins || !hasInitialLoadRef.current) return;

    const savePinsToStorage = async () => {
      // Skip saving if we're in the initial load sequence and pins weren't modified
      // This prevents unnecessary writes on command startup
      if (pinnedResults.length === 0 && pendingPinUpdateRef.current === false) {
        // If we have zero pins and no pending updates, likely just loaded defaults
        // Skip the automatic save to prevent unnecessary writes
        log("debug", "usePinManagement", "Skipping initial empty pins save");
        return;
      }

      await pinStorage.savePins(pinnedResults, {
        searchScope,
        isShowingDetail,
        showNonCloudLibraryPaths,
      });
    };

    savePinsToStorage();
  }, [pinnedResults, hasCheckedPins, searchScope, isShowingDetail, showNonCloudLibraryPaths, pinStorage]);

  /**
   * Check if a result is pinned
   */
  const resultIsPinned = useCallback(
    (result: SpotlightSearchResult) => {
      return pinnedResults.some((pin) => pin.path === result.path);
    },
    [pinnedResults],
  );

  /**
   * Remove a result from pinned results
   */
  const removeResultFromPinnedResults = useCallback((result: SpotlightSearchResult) => {
    setPinnedResults((prevPins) => prevPins.filter((pin) => pin.path !== result.path));
  }, []);

  /**
   * Toggle a result's pinned status
   */
  const toggleResultPinnedStatus = useCallback(
    (result: SpotlightSearchResult, resultIndex: number) => {
      log(
        "debug",
        "usePinManagement",
        `${resultIsPinned(result) ? "Unpinning" : "Pinning"} folder: ${result.path.split("/").pop()}`,
      );

      // Mark that we have a pin update in progress
      pendingPinUpdateRef.current = true;

      let newPins: SpotlightSearchResult[] = [];

      // Update state and capture the new pins
      if (!resultIsPinned(result)) {
        setPinnedResults((prevPins) => {
          newPins = [result, ...prevPins];
          return newPins;
        });
      } else {
        setPinnedResults((prevPins) => {
          newPins = prevPins.filter((pin) => pin.path !== result.path);
          return newPins;
        });
      }

      // Immediately save to localStorage
      (async () => {
        try {
          const success = await pinStorage.savePins(newPins, {
            searchScope,
            isShowingDetail,
            showNonCloudLibraryPaths,
          });

          if (success) {
            log("debug", "usePinManagement", `Immediately saved pin change (${newPins.length} pins)`);
          }

          // Small delay to ensure state has updated in React
          setTimeout(() => {
            pendingPinUpdateRef.current = false;
          }, 50);
        } catch {
          log("error", "usePinManagement", "Error saving pins");
          pendingPinUpdateRef.current = false;
        }
      })();

      setSelectedItemId(`result-${resultIndex.toString()}`);
    },
    [resultIsPinned, pinnedResults, searchScope, isShowingDetail, showNonCloudLibraryPaths],
  );

  /**
   * Move a pin up in the list
   */
  const movePinUp = useCallback(
    (result: SpotlightSearchResult, resultIndex: number) => {
      try {
        log("debug", "usePinManagement", "Moving pin up", {
          resultPath: result.path,
          currentIndex: resultIndex,
          newIndex: resultIndex - 1,
        });

        const newIndex = resultIndex - 1;
        if (newIndex < 0) {
          log("debug", "usePinManagement", "Cannot move pin up - already at top", {
            resultPath: result.path,
            currentIndex: resultIndex,
          });
          return;
        }

        const newPinnedResults = [...pinnedResults];
        [newPinnedResults[resultIndex], newPinnedResults[newIndex]] = [
          newPinnedResults[newIndex],
          newPinnedResults[resultIndex],
        ];
        setPinnedResults(newPinnedResults);

        log("debug", "usePinManagement", "Successfully moved pin up", {
          resultPath: result.path,
          oldIndex: resultIndex,
          newIndex,
        });
      } catch (error) {
        log("error", "usePinManagement", "Error moving pin up", {
          error,
          resultPath: result.path,
          currentIndex: resultIndex,
        });
        showFailureToast(error, { title: "Error moving item up" });
      }
    },
    [pinnedResults],
  );

  /**
   * Move a pin down in the list
   */
  const movePinDown = useCallback(
    (result: SpotlightSearchResult, resultIndex: number) => {
      try {
        log("debug", "usePinManagement", "Moving pin down", {
          resultPath: result.path,
          currentIndex: resultIndex,
          newIndex: resultIndex + 1,
        });

        const newIndex = resultIndex + 1;
        if (newIndex >= pinnedResults.length) {
          log("debug", "usePinManagement", "Cannot move pin down - already at bottom", {
            resultPath: result.path,
            currentIndex: resultIndex,
          });
          return;
        }

        const newPinnedResults = [...pinnedResults];
        [newPinnedResults[resultIndex], newPinnedResults[newIndex]] = [
          newPinnedResults[newIndex],
          newPinnedResults[resultIndex],
        ];
        setPinnedResults(newPinnedResults);

        log("debug", "usePinManagement", "Successfully moved pin down", {
          resultPath: result.path,
          oldIndex: resultIndex,
          newIndex,
        });
      } catch (error) {
        log("error", "usePinManagement", "Error moving pin down", {
          error,
          resultPath: result.path,
          currentIndex: resultIndex,
        });
        showFailureToast(error, { title: "Error moving item down" });
      }
    },
    [pinnedResults],
  );

  // Counter for tracking function calls
  let refreshCallCounter = 0;

  // Ref to track if a refresh is currently in progress
  const isRefreshingRef = useRef<boolean>(false);

  /**
   * Refresh pins from storage (used when returning from another view)
   */
  const refreshPinsFromStorage = useCallback(() => {
    // If a refresh is already in progress, don't start another one
    if (isRefreshingRef.current) {
      log("debug", "usePinManagement", "Refresh already in progress, skipping duplicate call");
      return;
    }

    const callId = ++refreshCallCounter;
    log(
      "debug",
      "usePinManagement",
      `[refresh #${callId}] Explicitly refreshing pins from storage (current pin count: ${pinnedResults.length})`,
    );

    // Mark that a refresh is in progress
    isRefreshingRef.current = true;

    const refreshPins = async () => {
      try {
        // When we have a pending update, read directly from localStorage instead of waiting
        if (pendingPinUpdateRef.current) {
          log(
            "debug",
            "usePinManagement",
            `[refresh #${callId}] Pending pin update detected, reading directly from storage`,
          );

          try {
            // Get the current pins directly from localStorage
            const storedPins = await pinStorage.loadPins();

            // Update state with the most recent values
            log(
              "debug",
              "usePinManagement",
              `[refresh #${callId}] Loaded ${storedPins.length} pins directly from storage`,
            );
            setPinnedResults(storedPins);

            // Reset the pending flag since we've now processed the latest state
            pendingPinUpdateRef.current = false;

            // Mark that refresh is complete
            isRefreshingRef.current = false;
            return;
          } catch (error) {
            log("error", "usePinManagement", `[refresh #${callId}] Error reading pins during pending update`, {
              error: error instanceof Error ? error.message : String(error),
            });
            // Continue with standard refresh flow if direct access fails
          }
        }

        // Standard path - load pins from storage
        const storedPins = await pinStorage.loadPins();

        // Check if pins have actually changed
        const currentPaths = new Set(pinnedResults.map((pin) => pin.path));
        const storedPaths = new Set(storedPins.map((pin: SpotlightSearchResult) => pin.path));

        // Compare pin paths to determine if an update is needed
        let pathsChanged = false;

        if (currentPaths.size !== storedPaths.size) {
          log(
            "debug",
            "usePinManagement",
            `[refresh #${callId}] Pin count changed: ${currentPaths.size} → ${storedPaths.size}`,
          );
          pathsChanged = true;
        } else {
          // Check if any paths in storedPaths are not in currentPaths
          for (const pathStr of storedPaths) {
            if (!currentPaths.has(String(pathStr))) {
              log("debug", "usePinManagement", `[refresh #${callId}] Found new pin: ${pathStr}`);
              pathsChanged = true;
              break;
            }
          }

          // Also check if any paths in currentPaths are not in storedPaths
          if (!pathsChanged) {
            for (const pathStr of currentPaths) {
              if (!storedPaths.has(String(pathStr))) {
                log("debug", "usePinManagement", `[refresh #${callId}] Pin removed: ${pathStr}`);
                pathsChanged = true;
                break;
              }
            }
          }
        }

        if (pathsChanged) {
          log("debug", "usePinManagement", `[refresh #${callId}] Pins changed, updating state`);
          setPinnedResults(storedPins);
        } else {
          log("debug", "usePinManagement", `[refresh #${callId}] Pins unchanged, skipping update`);
        }
      } catch (e) {
        log("error", "usePinManagement", `[refresh #${callId}] Error refreshing pins`, {
          error: e instanceof Error ? e.message : String(e),
        });
      } finally {
        // Always mark refresh as complete, even if there was an error
        isRefreshingRef.current = false;
      }
    };

    refreshPins();
  }, [pinnedResults, pinStorage]);

  return {
    pinnedResults,
    hasCheckedPins,
    selectedItemId,
    setSelectedItemId,
    resultIsPinned,
    toggleResultPinnedStatus,
    removeResultFromPinnedResults,
    movePinUp,
    movePinDown,
    refreshPinsFromStorage,
  };
}
