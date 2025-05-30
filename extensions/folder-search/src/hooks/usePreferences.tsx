import { useState, useEffect } from "react";
import { LocalStorage, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { log } from "../utils";
import { SpotlightSearchPreferences } from "../types";
import { userInfo } from "os";

/**
 * Hook for managing user preferences
 */
export function usePreferences() {
  const [searchScope, setSearchScope] = useState<string>(userInfo().homedir);
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const [showNonCloudLibraryPaths, setShowNonCloudLibraryPaths] = useState<boolean>(false);
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState<boolean>(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        log("debug", "usePreferences", "Loading preferences");

        // Get preferences from LocalStorage
        const maybePreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);

        if (maybePreferences) {
          try {
            const preferences = JSON.parse(maybePreferences as string);

            // Update state with loaded preferences
            setSearchScope(preferences?.searchScope || userInfo().homedir);
            setIsShowingDetail(preferences?.isShowingDetail !== undefined ? preferences.isShowingDetail : true);
            setShowNonCloudLibraryPaths(preferences?.showNonCloudLibraryPaths || false);

            log("debug", "usePreferences", "Loaded preferences", {
              searchScope: preferences?.searchScope,
              isShowingDetail: preferences?.isShowingDetail,
              showNonCloudLibraryPaths: preferences?.showNonCloudLibraryPaths,
            });
          } catch (error) {
            log("error", "usePreferences", "Error parsing preferences from storage", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        setHasCheckedPreferences(true);
      } catch (error) {
        log("error", "usePreferences", "Error loading preferences", {
          error: error instanceof Error ? error.message : String(error),
        });
        showFailureToast({ title: "Could not read preferences" });
        setHasCheckedPreferences(true);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (!hasCheckedPreferences) return;

    const savePreferences = async () => {
      try {
        // Get current preferences to update only changed values
        const maybePreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);
        let currentPrefs: Partial<SpotlightSearchPreferences> = {};
        let hasChanged = false;

        if (maybePreferences) {
          try {
            currentPrefs = JSON.parse(maybePreferences as string);

            // Check if any values have actually changed
            hasChanged =
              currentPrefs.searchScope !== searchScope ||
              currentPrefs.isShowingDetail !== isShowingDetail ||
              currentPrefs.showNonCloudLibraryPaths !== showNonCloudLibraryPaths;

            if (!hasChanged) {
              log("debug", "usePreferences", "No preference changes detected, skipping save");
              return;
            }
          } catch {
            log("error", "usePreferences", "Error parsing existing preferences");
            hasChanged = true; // Force save if we can't parse current prefs
          }
        } else {
          // No existing preferences, consider this a change
          hasChanged = true;
        }

        // Only save if something changed
        if (hasChanged) {
          // Update with new values
          const updatedPrefs = {
            ...currentPrefs,
            searchScope,
            isShowingDetail,
            showNonCloudLibraryPaths,
          };

          // Save to localStorage
          await LocalStorage.setItem(`${environment.extensionName}-preferences`, JSON.stringify(updatedPrefs));

          log("debug", "usePreferences", "Saved preferences", {
            searchScope,
            isShowingDetail,
            showNonCloudLibraryPaths,
          });
        }
      } catch (error) {
        log("error", "usePreferences", "Error saving preferences", {
          error: error instanceof Error ? error.message : String(error),
        });
        showFailureToast({ title: "Could not save preferences" });
      }
    };

    savePreferences();
  }, [searchScope, isShowingDetail, showNonCloudLibraryPaths, hasCheckedPreferences]);

  return {
    searchScope,
    setSearchScope,
    isShowingDetail,
    setIsShowingDetail,
    showNonCloudLibraryPaths,
    setShowNonCloudLibraryPaths,
    hasCheckedPreferences,
  };
}
