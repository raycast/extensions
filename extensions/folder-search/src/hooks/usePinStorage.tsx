import { useLocalStorage } from "@raycast/utils";
import { log } from "../utils";
import { SpotlightSearchResult } from "../types";

const STORAGE_KEY = "folder-search-pins";

type PinStorageOptions = {
  searchScope?: string;
  isShowingDetail?: boolean;
  showNonCloudLibraryPaths?: boolean;
};

/**
 * Hook for managing pin storage operations
 */
export function usePinStorage() {
  const {
    value: cachedPins = [],
    setValue: setCachedPins,
    isLoading,
  } = useLocalStorage<SpotlightSearchResult[]>(STORAGE_KEY, []);

  /**
   * Load pins from storage
   */
  const loadPins = async (): Promise<SpotlightSearchResult[]> => {
    try {
      log("debug", "usePinStorage", `Loaded ${cachedPins.length} pins from storage`);
      return cachedPins;
    } catch (error) {
      log("error", "usePinStorage", "Error loading pins", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  };

  /**
   * Save pins to storage
   */
  const savePins = async (
    pins: SpotlightSearchResult[],
    additionalPrefs?: PinStorageOptions,
  ): Promise<boolean> => {
    try {
      await setCachedPins(pins);
      log("debug", "usePinStorage", `Saved ${pins.length} pins to storage`);
      return true;
    } catch (error) {
      log("error", "usePinStorage", "Error saving pins", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  };

  return {
    loadPins,
    savePins,
    isLoading,
    cachedPins,
  };
}