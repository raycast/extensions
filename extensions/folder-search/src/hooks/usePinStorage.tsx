import { LocalStorage, environment } from "@raycast/api";
import { log } from "../utils";
import { SpotlightSearchResult } from "../types";

/**
 * Hook for managing pin storage operations
 */
export function usePinStorage() {
  /**
   * Load pins from LocalStorage
   */
  const loadPins = async (): Promise<SpotlightSearchResult[]> => {
    try {
      const maybePreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);

      if (!maybePreferences) {
        log("debug", "usePinStorage", "No preferences found in storage");
        return [];
      }

      try {
        const preferences = JSON.parse(maybePreferences as string);
        const storedPins = preferences?.pinned || [];
        log("debug", "usePinStorage", `Loaded ${storedPins.length} pins from preferences`);
        return storedPins;
      } catch (e) {
        log("error", "usePinStorage", "Error parsing preferences from storage", {
          error: e instanceof Error ? e.message : String(e),
        });
        return [];
      }
    } catch (error) {
      log("error", "usePinStorage", "Error loading pins from storage", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  };

  /**
   * Save pins to LocalStorage
   */
  const savePins = async (
    pins: SpotlightSearchResult[],
    additionalPrefs?: {
      searchScope?: string;
      isShowingDetail?: boolean;
      showNonCloudLibraryPaths?: boolean;
    },
  ): Promise<boolean> => {
    try {
      await LocalStorage.setItem(
        `${environment.extensionName}-preferences`,
        JSON.stringify({
          pinned: pins,
          searchScope: additionalPrefs?.searchScope || "",
          isShowingDetail: additionalPrefs?.isShowingDetail,
          showNonCloudLibraryPaths: additionalPrefs?.showNonCloudLibraryPaths || false,
        }),
      );

      // Only log on significant pin count changes
      if (pins.length % 5 === 0) {
        log("debug", "usePinStorage", `Saved preferences with ${pins.length} pins`);
      }

      return true;
    } catch (error) {
      log("error", "usePinStorage", "Error saving pins to storage", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  };

  return {
    loadPins,
    savePins,
  };
}
