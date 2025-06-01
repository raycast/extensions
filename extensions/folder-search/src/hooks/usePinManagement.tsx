import { useState, useCallback, useRef } from "react";
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
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const pinStorage = usePinStorage();

  // Keep track of pending state updates
  const pendingPinUpdateRef = useRef<boolean>(false);

  /**
   * Check if a result is pinned
   */
  const resultIsPinned = useCallback(
    (result: SpotlightSearchResult) => {
      return pinStorage.cachedPins.some((pin) => pin.path === result.path);
    },
    [pinStorage.cachedPins],
  );

  /**
   * Remove a result from pinned results
   */
  const removeResultFromPinnedResults = useCallback(async (result: SpotlightSearchResult) => {
    const newPins = pinStorage.cachedPins.filter((pin) => pin.path !== result.path);
    await pinStorage.savePins(newPins);
  }, [pinStorage]);

  /**
   * Toggle a result's pinned status
   */
  const toggleResultPinnedStatus = useCallback(
    async (result: SpotlightSearchResult, resultIndex: number) => {
      log(
        "debug",
        "usePinManagement",
        `Toggling pin status for folder: ${result.path.split("/").pop()}`,
      );

      // Mark that we have a pin update in progress
      pendingPinUpdateRef.current = true;

      try {
        const isPinned = resultIsPinned(result);
        let newPins: SpotlightSearchResult[] = [];

        if (!isPinned) {
          newPins = [result, ...pinStorage.cachedPins];
        } else {
          newPins = pinStorage.cachedPins.filter((pin) => pin.path !== result.path);
        }

        await pinStorage.savePins(newPins);
        log("debug", "usePinManagement", `Saved pin change (${newPins.length} pins)`);
      } catch (error) {
        log("error", "usePinManagement", "Error toggling pin status", {
          error: error instanceof Error ? error.message : String(error),
        });
        showFailureToast({ title: "Could not update pin status" });
      } finally {
        // Small delay to ensure state has updated
        setTimeout(() => {
          pendingPinUpdateRef.current = false;
        }, 50);
      }

      setSelectedItemId(`result-${resultIndex.toString()}`);
    },
    [pinStorage, resultIsPinned],
  );

  /**
   * Move a pin up in the list
   */
  const movePinUp = useCallback(
    async (result: SpotlightSearchResult, resultIndex: number) => {
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

        const newPinnedResults = [...pinStorage.cachedPins];
        [newPinnedResults[resultIndex], newPinnedResults[newIndex]] = [
          newPinnedResults[newIndex],
          newPinnedResults[resultIndex],
        ];
        
        await pinStorage.savePins(newPinnedResults);
        log("debug", "usePinManagement", "Successfully moved pin up", {
          resultPath: result.path,
          oldIndex: resultIndex,
          newIndex,
        });
      } catch (error) {
        log("error", "usePinManagement", "Error moving pin up", {
          error: error instanceof Error ? error.message : String(error),
        });
        showFailureToast({ title: "Error moving item up" });
      }
    },
    [pinStorage],
  );

  /**
   * Move a pin down in the list
   */
  const movePinDown = useCallback(
    async (result: SpotlightSearchResult, resultIndex: number) => {
      try {
        log("debug", "usePinManagement", "Moving pin down", {
          resultPath: result.path,
          currentIndex: resultIndex,
          newIndex: resultIndex + 1,
        });

        const newIndex = resultIndex + 1;
        if (newIndex >= pinStorage.cachedPins.length) {
          log("debug", "usePinManagement", "Cannot move pin down - already at bottom", {
            resultPath: result.path,
            currentIndex: resultIndex,
          });
          return;
        }

        const newPinnedResults = [...pinStorage.cachedPins];
        [newPinnedResults[resultIndex], newPinnedResults[newIndex]] = [
          newPinnedResults[newIndex],
          newPinnedResults[resultIndex],
        ];
        
        await pinStorage.savePins(newPinnedResults);
        log("debug", "usePinManagement", "Successfully moved pin down", {
          resultPath: result.path,
          oldIndex: resultIndex,
          newIndex,
        });
      } catch (error) {
        log("error", "usePinManagement", "Error moving pin down", {
          error: error instanceof Error ? error.message : String(error),
        });
        showFailureToast({ title: "Error moving item down" });
      }
    },
    [pinStorage],
  );

  /**
   * Refresh pins from storage (used when returning from another view)
   */
  const refreshPinsFromStorage = useCallback(async () => {
    if (pendingPinUpdateRef.current) {
      log("debug", "usePinManagement", "Refresh already in progress, skipping duplicate call");
      return;
    }

    try {
      await pinStorage.loadPins();
    } catch (error) {
      log("error", "usePinManagement", "Error refreshing pins", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [pinStorage]);

  return {
    pinnedResults: pinStorage.cachedPins,
    hasCheckedPins: !pinStorage.isLoading,
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