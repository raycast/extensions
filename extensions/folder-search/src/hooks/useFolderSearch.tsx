import { useCallback } from "react";
import { log } from "../utils";
import { usePinManagement, usePluginManagement, useSearchResults, usePreferences } from "./";

/**
 * Main hook for folder search functionality.
 * Composes smaller hooks for better modularity.
 */
export function useFolderSearch() {
  // Get preferences
  const preferences = usePreferences();

  // Get pin management
  const pinManagement = usePinManagement({
    searchScope: preferences.searchScope,
    isShowingDetail: preferences.isShowingDetail,
    showNonCloudLibraryPaths: preferences.showNonCloudLibraryPaths,
  });

  // Get plugin management
  const pluginManagement = usePluginManagement();

  // Get search results
  const searchResults = useSearchResults({
    searchScope: preferences.searchScope,
    pinnedResults: pinManagement.pinnedResults,
  });

  // Check if all required data is loaded
  const isReady = useCallback(() => {
    return pinManagement.hasCheckedPins && pluginManagement.hasCheckedPlugins && preferences.hasCheckedPreferences;
  }, [pinManagement.hasCheckedPins, pluginManagement.hasCheckedPlugins, preferences.hasCheckedPreferences]);

  // Log when all data is ready
  if (isReady()) {
    log("debug", "useFolderSearch", "All data loaded and ready", {
      plugins: pluginManagement.plugins.length,
      pins: pinManagement.pinnedResults.length,
      searchScope: preferences.searchScope,
    });
  }

  // Return combined API
  return {
    // Search functionality
    searchText: searchResults.searchText,
    setSearchText: searchResults.setSearchText,
    results: searchResults.results,
    isQuerying: searchResults.isQuerying,
    hasSearched: searchResults.hasSearched,

    // Pin management
    pinnedResults: pinManagement.pinnedResults,
    resultIsPinned: pinManagement.resultIsPinned,
    toggleResultPinnedStatus: pinManagement.toggleResultPinnedStatus,
    removeResultFromPinnedResults: pinManagement.removeResultFromPinnedResults,
    movePinUp: pinManagement.movePinUp,
    movePinDown: pinManagement.movePinDown,
    refreshPinsFromStorage: pinManagement.refreshPinsFromStorage,
    selectedItemId: pinManagement.selectedItemId,
    setSelectedItemId: pinManagement.setSelectedItemId,

    // Plugins
    plugins: pluginManagement.plugins,
    hasCheckedPlugins: pluginManagement.hasCheckedPlugins,

    // Preferences
    searchScope: preferences.searchScope,
    setSearchScope: preferences.setSearchScope,
    isShowingDetail: preferences.isShowingDetail,
    setIsShowingDetail: preferences.setIsShowingDetail,
    showNonCloudLibraryPaths: preferences.showNonCloudLibraryPaths,
    hasCheckedPreferences: preferences.hasCheckedPreferences,
  };
}
