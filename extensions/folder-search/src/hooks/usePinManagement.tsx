import { SpotlightSearchResult } from "../types";
import { usePinStorage } from "./usePinStorage";
import { useState, useCallback } from "react";

/**
 * Hook for managing pin operations
 */
export function usePinManagement() {
  const pinStorage = usePinStorage();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Use reactive pins from pinStorage instead of local state
  const pinnedResults = pinStorage.pins;
  const hasCheckedPins = pinStorage.hasCheckedPins;

  // Check if a result is pinned
  const resultIsPinned = useCallback(
    (result: SpotlightSearchResult) => {
      return pinnedResults.some((pin) => pin.path === result.path);
    },
    [pinnedResults],
  );

  // Toggle pin status of a result
  const toggleResultPinnedStatus = useCallback(
    async (result: SpotlightSearchResult) => {
      const isPinned = resultIsPinned(result);
      let newPinnedResults: SpotlightSearchResult[];

      if (isPinned) {
        newPinnedResults = pinnedResults.filter((pin) => pin.path !== result.path);
      } else {
        newPinnedResults = [result, ...pinnedResults];
      }

      await pinStorage.savePins(newPinnedResults);
    },
    [pinnedResults, resultIsPinned, pinStorage],
  );

  // Remove a result from pinned results
  const removeResultFromPinnedResults = useCallback(
    async (result: SpotlightSearchResult) => {
      const newPinnedResults = pinnedResults.filter((pin) => pin.path !== result.path);
      await pinStorage.savePins(newPinnedResults);
    },
    [pinnedResults, pinStorage],
  );

  // Move a pin up in the list
  const movePinUp = useCallback(
    async (result: SpotlightSearchResult, resultIndex: number) => {
      if (resultIndex > 0) {
        const newPinnedResults = [...pinnedResults];
        [newPinnedResults[resultIndex - 1], newPinnedResults[resultIndex]] = [
          newPinnedResults[resultIndex],
          newPinnedResults[resultIndex - 1],
        ];
        await pinStorage.savePins(newPinnedResults);
      }
    },
    [pinnedResults, pinStorage],
  );

  // Move a pin down in the list
  const movePinDown = useCallback(
    async (result: SpotlightSearchResult, resultIndex: number) => {
      if (resultIndex < pinnedResults.length - 1) {
        const newPinnedResults = [...pinnedResults];
        [newPinnedResults[resultIndex], newPinnedResults[resultIndex + 1]] = [
          newPinnedResults[resultIndex + 1],
          newPinnedResults[resultIndex],
        ];
        await pinStorage.savePins(newPinnedResults);
      }
    },
    [pinnedResults, pinStorage],
  );

  // Refresh pins from storage
  const refreshPinsFromStorage = useCallback(async () => {
    await pinStorage.loadPins();
  }, [pinStorage]);

  return {
    pinnedResults,
    resultIsPinned,
    toggleResultPinnedStatus,
    removeResultFromPinnedResults,
    movePinUp,
    movePinDown,
    refreshPinsFromStorage,
    selectedItemId,
    setSelectedItemId,
    hasCheckedPins,
  };
}
