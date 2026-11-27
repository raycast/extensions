import { LaunchProps, getPreferenceValues, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  createNewTab,
  isAccessibilityPermissionError,
  isSearchBrowserInstalled,
  openUrlInSearch,
  showNotInstalledToast,
} from "./lib/browser";
import { PRIVACY_ACCESSIBILITY_URL, SearchEngineId } from "./lib/constants";
import { readBrowserSettings } from "./lib/data";
import { buildNavigableUrl, getDomain } from "./lib/utils";

export default async function NewTabCommand(props: LaunchProps<{ arguments: Arguments.NewTab }>) {
  if (!(await isSearchBrowserInstalled())) {
    await showNotInstalledToast();
    return;
  }

  const query = props.arguments.query?.trim() || "";

  try {
    if (query) {
      const preferences = getPreferenceValues<Preferences>();
      const settings = readBrowserSettings();
      const { url, isSearch, engineName } = buildNavigableUrl(
        query,
        preferences.searchEngine as SearchEngineId | undefined,
        settings
      );
      await openUrlInSearch(url);
      await showHUD(
        isSearch ? `Searching ${engineName} in Search Browser` : `Opened ${getDomain(url)} in Search Browser`
      );
      return;
    }

    await createNewTab();
    await showHUD("Opened New Tab in Search Browser");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to open new tab",
      primaryAction: isAccessibilityPermissionError(error)
        ? {
            title: "Open Accessibility Settings",
            onAction: () => open(PRIVACY_ACCESSIBILITY_URL),
          }
        : undefined,
    });
  }
}
