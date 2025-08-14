import { environment, LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { log } from "../utils";
import { SpotlightSearchResult } from "../types";
import { useEffect } from "react";

/**
 * Hook for managing pin storage operations
 */
export function usePinStorage() {
  // Use dedicated storage key just for pins
  const {
    value: pins,
    setValue: setPins,
    isLoading,
  } = useLocalStorage<SpotlightSearchResult[]>(`${environment.extensionName}-pins`, []);

  // Migrate pins from old location if needed
  useEffect(() => {
    const migratePinsIfNeeded = async () => {
      // Only migrate if we have no pins and not currently loading
      if (!isLoading && (!pins || pins.length === 0)) {
        try {
          const oldPreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);
          if (oldPreferences) {
            const parsed = JSON.parse(oldPreferences as string);
            if (parsed?.pinned && parsed.pinned.length > 0) {
              log("debug", "usePinStorage", `Migrating ${parsed.pinned.length} pins from old storage`);

              // Copy pins to new location
              await setPins(parsed.pinned);

              // Remove pins from old location to complete the migration
              const updatedPreferences = { ...parsed };
              delete updatedPreferences.pinned;
              await LocalStorage.setItem(
                `${environment.extensionName}-preferences`,
                JSON.stringify(updatedPreferences),
              );

              log("debug", "usePinStorage", "Migration completed, pins removed from old storage");
            }
          }
        } catch (error) {
          log("error", "usePinStorage", "Error migrating pins", { error });
        }
      }
    };

    migratePinsIfNeeded();
  }, [isLoading, pins, setPins]);

  /**
   * Load pins from LocalStorage
   */
  const loadPins = async (): Promise<SpotlightSearchResult[]> => {
    return pins || [];
  };

  /**
   * Save pins to LocalStorage
   */
  const savePins = async (newPins: SpotlightSearchResult[]): Promise<boolean> => {
    try {
      await setPins(newPins);
      log("debug", "usePinStorage", `Saved ${newPins.length} pins`);
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
    pins: pins || [],
    hasCheckedPins: !isLoading,
  };
}
