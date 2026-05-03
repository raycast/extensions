import type { DirectoryBrowserProps } from "$lib/pages/directory-browser/types";

type DirectoryBrowserDefaults = Omit<DirectoryBrowserProps, "path">;

export function getDirectoryBrowserDefaults(preferences: Preferences): DirectoryBrowserDefaults {
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
