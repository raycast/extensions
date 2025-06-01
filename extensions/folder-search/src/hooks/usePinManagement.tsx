import { SpotlightSearchResult } from "../types";
import { usePinStorage } from "./usePinStorage";
import { useState, useEffect, useCallback } from "react";

type PinManagementProps = {
  searchScope?: string;
  isShowingDetail?: boolean;
  showNonCloudLibraryPaths?: boolean;
};

/**
 * Hook for managing pin operations
 */
export function usePinManagement(props: PinManagementProps) {
  const pinStorage = usePinStorage();
  const [pinnedResults, setPinnedResults] = useState<SpotlightSearchResult[]>([]);
  const [hasCheckedPins, setHasCheckedPins] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Load pins on mount
  useEffect(() => {
    const loadPins = async () => {
      const pins = await pinStorage.loadPins();
      setPinnedResults(pins);
      setHasCheckedPins(true);
    };
    loadPins();
  }, []);

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
        newPinnedResults = [...pinnedResults, result];
      }

      setPinnedResults(newPinnedResults);
      await pinStorage.savePins(newPinnedResults, props);
    },
    [pinnedResults, resultIsPinned, props],
  );

  // Remove a result from pinned results
  const removeResultFromPinnedResults = useCallback(
    async (result: SpotlightSearchResult) => {
      const newPinnedResults = pinnedResults.filter((pin) => pin.path !== result.path);
      setPinnedResults(newPinnedResults);
      await pinStorage.savePins(newPinnedResults, props);
    },
    [pinnedResults, props],
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
        setPinnedResults(newPinnedResults);
        await pinStorage.savePins(newPinnedResults, props);
      }
    },
    [pinnedResults, props],
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
        setPinnedResults(newPinnedResults);
        await pinStorage.savePins(newPinnedResults, props);
      }
    },
    [pinnedResults, props],
  );

  // Refresh pins from storage
  const refreshPinsFromStorage = useCallback(async () => {
    const pins = await pinStorage.loadPins();
    setPinnedResults(pins);
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
