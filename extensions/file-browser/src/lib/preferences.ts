import { getPreferenceValues } from "@raycast/api";
import type { DirectoryBrowserProps } from "$lib/pages/directory-browser/types";
import type { SortMode } from "$lib/types";
import type { EnterKeyAction } from "$lib/components/contents/types";

type ExtensionPreferences = {
export function getExtensionPreferences() {
  return getPreferenceValues<Preferences>();
}
}

export function getDirectoryBrowserDefaults(preferences: ExtensionPreferences): DirectoryBrowserDefaults {
  return {
    initialView: preferences.viewMode,
    initialSort: preferences.sortMode,
    gridColumns: Number(preferences.gridColumns),
    enterAction: preferences.enterAction ?? "detail",
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
