import { useLocalStorage } from "@raycast/utils";
import { log } from "../utils";
import { userInfo } from "os";

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
 * Hook for managing user preferences
 */
export function usePreferences() {
  const {
    value: preferences,
    setValue: setPreferences,
    isLoading: hasCheckedPreferences,
  } = useLocalStorage<PreferencesState>("folder-search-preferences", defaultPreferences);

  // Individual setters for backward compatibility
  const setSearchScope = (value: string) => {
    log("debug", "usePreferences", "Updating search scope", { value });
    setPreferences({
      ...(preferences || defaultPreferences),
      searchScope: value,
    });
  };

  const setIsShowingDetail = (value: boolean) => {
    log("debug", "usePreferences", "Updating detail view", { value });
    setPreferences({
      ...(preferences || defaultPreferences),
      isShowingDetail: value,
    });
  };

  const setShowNonCloudLibraryPaths = (value: boolean) => {
    log("debug", "usePreferences", "Updating library paths setting", { value });
    setPreferences({
      ...(preferences || defaultPreferences),
      showNonCloudLibraryPaths: value,
    });
  };

  const currentPrefs = preferences || defaultPreferences;

  return {
    searchScope: currentPrefs.searchScope,
    setSearchScope,
    isShowingDetail: currentPrefs.isShowingDetail,
    setIsShowingDetail,
    showNonCloudLibraryPaths: currentPrefs.showNonCloudLibraryPaths,
    setShowNonCloudLibraryPaths,
    hasCheckedPreferences: !hasCheckedPreferences, // invert since isLoading means not checked
  };
}
