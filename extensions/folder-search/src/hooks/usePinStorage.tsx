import { useCachedState } from "@raycast/utils";
import { LocalStorage, environment } from "@raycast/api";
import { log } from "../utils";
import { SpotlightSearchResult } from "../types";
import { DEFAULT_PREFERENCES } from "../constants";
import { useEffect } from "react";

/**
 * Hook for managing pin storage operations
 */
export function usePinStorage() {
  const [cachedPins, setCachedPins] = useCachedState<SpotlightSearchResult[]>("folder-search-pins", []);

  // Migration effect: Check for existing pins in old format and migrate them
  useEffect(() => {
    const migrateExistingPins = async () => {
      try {
        // If we already have pins in the new format, don't migrate
        if (cachedPins.length > 0) {
          log("debug", "usePinStorage", "Pins already exist in new format, skipping migration");
          return;
        }

        // Check for pins in the old format
        const maybeOldPreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);

        if (maybeOldPreferences) {
          try {
            const oldPreferences = JSON.parse(maybeOldPreferences as string);
            const oldPins = oldPreferences?.pinned || [];

            if (oldPins.length > 0) {
              log("debug", "usePinStorage", `Migrating ${oldPins.length} pins from old format`);
              setCachedPins(oldPins);

              // Keep the old preferences structure for other data, just remove the pinned array
              // since we're now storing pins separately
              const updatedOldPreferences = { ...oldPreferences };
              delete updatedOldPreferences.pinned;

              await LocalStorage.setItem(
                `${environment.extensionName}-preferences`,
                JSON.stringify(updatedOldPreferences),
              );

              log("debug", "usePinStorage", "Successfully migrated pins to new format");
            }
          } catch (error) {
            log("error", "usePinStorage", "Error parsing old preferences during migration", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } catch (error) {
        log("error", "usePinStorage", "Error during pin migration", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    migrateExistingPins();
  }, []); // Only run once on mount

  /**
   * Load pins from storage
   */
  const loadPins = async (): Promise<SpotlightSearchResult[]> => {
    log("debug", "usePinStorage", `Loaded ${cachedPins.length} pins from cache`);
    return cachedPins;
  };

  /**
   * Save pins to storage
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
      // Update the cached pins
      setCachedPins(pins);

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
