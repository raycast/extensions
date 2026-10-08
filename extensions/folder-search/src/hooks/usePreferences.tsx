import { getPreferenceValues, environment } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { log } from "../utils";
import { userInfo } from "os";

// Raycast preferences from package.json
export interface RaycastPreferences {
  maxResults: string;
  filterLibraryFolders: boolean;
  pluginsEnabled: boolean;
  pluginsFolder: string;
}

// Dynamic preferences stored in LocalStorage
interface PreferencesState {
  searchScope: string;
  isShowingDetail: boolean;
  showNonCloudLibraryPaths: boolean;
}

const defaultPreferences: PreferencesState = {
  searchScope: userInfo().homedir,
  isShowingDetail: false,
  showNonCloudLibraryPaths: false,
};

/**
 * Hook for managing both Raycast preferences and dynamic preferences
 */
export function usePreferences() {
  // Get Raycast preferences
  const raycastPrefs = getPreferenceValues<RaycastPreferences>();

  // Get dynamic preferences from LocalStorage
  const {
    value: preferences,
    setValue: setPreferences,
    isLoading,
  } = useLocalStorage<PreferencesState>(`${environment.extensionName}-preferences`, defaultPreferences);

  const currentPrefs = preferences || defaultPreferences;

  // Individual setters for backward compatibility
  const setSearchScope = (value: string) => {
    log("debug", "usePreferences", "Updating search scope", { value });
    setPreferences({
      ...currentPrefs,
      searchScope: value,
    });
  };

  const setIsShowingDetail = (value: boolean) => {
    log("debug", "usePreferences", "Updating detail view", { value });
    setPreferences({
      ...currentPrefs,
      isShowingDetail: value,
    });
  };

  const setShowNonCloudLibraryPaths = (value: boolean) => {
    log("debug", "usePreferences", "Updating library paths setting", { value });
    setPreferences({
      ...currentPrefs,
      showNonCloudLibraryPaths: value,
    });
  };

  return {
    // Raycast preferences
    maxResults: parseInt(raycastPrefs.maxResults) || 250,
    filterLibraryFolders: raycastPrefs.filterLibraryFolders,
    pluginsEnabled: raycastPrefs.pluginsEnabled,
    pluginsFolder: raycastPrefs.pluginsFolder,

    // Dynamic preferences
    searchScope: currentPrefs.searchScope,
    setSearchScope,
    isShowingDetail: currentPrefs.isShowingDetail,
    setIsShowingDetail,
    showNonCloudLibraryPaths: currentPrefs.showNonCloudLibraryPaths,
    setShowNonCloudLibraryPaths,

    // UI
    hasCheckedPreferences: !isLoading, // Fixed: when not loading, preferences are checked
  };
}
