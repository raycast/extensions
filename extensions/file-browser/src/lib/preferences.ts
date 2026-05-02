import { getPreferenceValues } from "@raycast/api";
import type { DirectoryBrowserProps } from "$lib/pages/directory-browser/types";
import type { SortMode } from "$lib/types";

type ExtensionPreferences = {
  startDirectory?: string;
  viewMode: "list" | "grid";
  gridColumns: "4" | "5" | "6" | "7" | "8";
  sortMode: SortMode;
  showHidden: boolean;
  showLastUsed: boolean;
  showTags: boolean;
  showSize: boolean;
  showAttrChanged: boolean;
  showCreated: boolean;
  showContentChanged: boolean;
};

type DirectoryBrowserDefaults = Omit<DirectoryBrowserProps, "path">;

export function getExtensionPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function getDirectoryBrowserDefaults(preferences: ExtensionPreferences): DirectoryBrowserDefaults {
  return {
    initialView: preferences.viewMode,
    initialSort: preferences.sortMode,
    gridColumns: Number(preferences.gridColumns),
    enabledAccessories: {
      showHidden: preferences.showHidden ?? true,
      showLastUsed: preferences.showLastUsed ?? false,
      showTags: preferences.showTags ?? true,
      showSize: preferences.showSize ?? true,
      showAttrChanged: preferences.showAttrChanged ?? false,
      showCreated: preferences.showCreated ?? false,
      showContentChanged: preferences.showContentChanged ?? false,
    },
  };
}
