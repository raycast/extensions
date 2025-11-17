import { useCallback, useMemo, useRef } from "react";
import { environment } from "@raycast/api";
import { log } from "../utils";
import { usePinManagement, usePluginManagement, useSearchResults, usePreferences } from "./index";

// ============================================================================
// Logging Configuration - Centralized here as the main orchestrator hook
// ============================================================================
export const LOG_ENABLED = environment.isDevelopment; // Enable logging only in development mode
export const LOG_LEVEL: "debug" | "error" = "debug"; // Set to "debug" for verbose logging or "error" for less noise
export const LOG_CACHE_OPERATIONS = false; // Set to true to log detailed cache operations

/**
 * Main hook for folder search functionality.
 * Composes smaller hooks for better modularity.
 */
export function useFolderSearch() {
  // Get preferences
  const preferences = usePreferences();

  // Get pin management
  const pinManagement = usePinManagement();

  // Get plugin management
  const pluginManagement = usePluginManagement();

  // Get search results with memoized props
  const searchResultsProps = useMemo(
    () => ({
      searchScope: preferences.searchScope,
      pinnedResults: pinManagement.pinnedResults,
    }),
    [preferences.searchScope, pinManagement.pinnedResults],
  );

  const searchResults = useSearchResults(searchResultsProps);

  // Check if all required data is loaded
  const isReady = useCallback(() => {
    return pinManagement.hasCheckedPins && pluginManagement.hasCheckedPlugins && preferences.hasCheckedPreferences;
  }, [pinManagement.hasCheckedPins, pluginManagement.hasCheckedPlugins, preferences.hasCheckedPreferences]);

  // Track if we've logged ready state to avoid spam
  const hasLoggedReadyRef = useRef<boolean>(false);

  // Log when all data is ready (only once)
  if (isReady() && !hasLoggedReadyRef.current) {
    log("debug", "useFolderSearch", "All data loaded and ready", {
      plugins: pluginManagement.plugins.length,
      pins: pinManagement.pinnedResults.length,
      searchScope: preferences.searchScope,
    });
    hasLoggedReadyRef.current = true;
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
