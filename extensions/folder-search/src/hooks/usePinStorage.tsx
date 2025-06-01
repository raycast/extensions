import { useLocalStorage } from "@raycast/utils";
import { LocalStorage, environment } from "@raycast/api";
import { log } from "../utils";
import { SpotlightSearchResult } from "../types";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "folder-search-pins";
const PREFERENCES_KEY = `${environment.extensionName}-preferences`;

/**
 * Hook for managing pin storage operations
 *
 * Migration Note (Added June 2024):
 * This code includes migration logic to move pins from the old storage format
 * (stored in preferences) to the new format (stored in LocalStorage). This migration
 * code can be safely removed after June 2025, as by then all users should have
 * migrated to the new format.
 */
export function usePinStorage() {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const {
    value: cachedPins,
    setValue: setCachedPins,
    isLoading,
  } = useLocalStorage<SpotlightSearchResult[]>(STORAGE_KEY, []);
  const migrationAttemptedRef = useRef(false);

  // Initialize state when loading completes
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  // Migration effect
  useEffect(() => {
    if (!isInitialized) return;

    const migrateExistingPins = async () => {
      // Skip if already attempted or still loading
      if (migrationAttemptedRef.current || isLoading) {
        log("debug", "usePinStorage", "Skipping migration", {
          reason: migrationAttemptedRef.current ? "already attempted" : "still loading",
        });
        return;
      }

      migrationAttemptedRef.current = true;
      log("debug", "usePinStorage", "Starting migration check");

      try {
        // Check old format first - only migrate if we find pins here
        const oldPreferences = await LocalStorage.getItem(PREFERENCES_KEY);
        if (!oldPreferences) {
          log("debug", "usePinStorage", "No old preferences found, skipping migration");
          return;
        }

        try {
          const parsedPrefs = JSON.parse(oldPreferences as string);
          const oldPins = parsedPrefs?.pinned || [];

          if (oldPins.length === 0) {
            log("debug", "usePinStorage", "No pins found in old format, skipping migration");
            return;
          }

          // Check if we already have pins in new format
          const existingPins = await LocalStorage.getItem(STORAGE_KEY);
          const hasExistingPins = existingPins && JSON.parse(existingPins as string).length > 0;

          if (hasExistingPins) {
            log("debug", "usePinStorage", "Pins already exist in new format, skipping migration");
            return;
          }

          // Migrate pins
          log("debug", "usePinStorage", "Migrating pins", {
            count: oldPins.length,
            paths: oldPins.map((pin: SpotlightSearchResult) => pin.path),
          });

          // Update new format and UI state immediately
          await setCachedPins(oldPins);

          // Force a refresh of the cached pins to ensure UI updates
          const updatedPins = await LocalStorage.getItem(STORAGE_KEY);
          if (updatedPins) {
            const parsedPins = JSON.parse(updatedPins as string);
            await setCachedPins(parsedPins);
          }

          // Clean up old format
          const { pinned, ...updatedPrefs } = parsedPrefs;
          await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPrefs));

          log("debug", "usePinStorage", "Migration completed successfully");
        } catch (error) {
          log("error", "usePinStorage", "Error parsing old preferences", {
            error: error instanceof Error ? error.message : String(error),
            rawPreferences: oldPreferences,
          });
        }
      } catch (error) {
        log("error", "usePinStorage", "Migration failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    migrateExistingPins();
  }, [isLoading, isInitialized]);

  /**
   * Load pins from storage
   */
  const loadPins = async (): Promise<SpotlightSearchResult[]> => {
    try {
      const storedPins = await LocalStorage.getItem(STORAGE_KEY);
      if (storedPins) {
        const parsedPins = JSON.parse(storedPins as string);
        log("debug", "usePinStorage", "Loaded pins from storage", {
          count: parsedPins.length,
          paths: parsedPins.map((pin: SpotlightSearchResult) => pin.path),
        });
        return parsedPins;
      }

      log("debug", "usePinStorage", "No pins in storage, using cached pins", {
        hasCachedPins: Boolean(cachedPins),
        count: cachedPins?.length,
      });
      return cachedPins || [];
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
    additionalPrefs?: {
      searchScope?: string;
      isShowingDetail?: boolean;
      showNonCloudLibraryPaths?: boolean;
    },
  ): Promise<boolean> => {
    try {
      // Skip if pins haven't changed
      if (JSON.stringify(pins) === JSON.stringify(cachedPins)) {
        log("debug", "usePinStorage", "Pins unchanged, skipping save");
        return true;
      }

      log("debug", "usePinStorage", "Saving pins", {
        count: pins.length,
        paths: pins.map((pin) => pin.path),
      });

      await setCachedPins(pins);
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
    isLoading: isLoading || !isInitialized,
  };
}
