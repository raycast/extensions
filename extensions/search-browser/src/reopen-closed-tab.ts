import { open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  isAccessibilityPermissionError,
  isSearchBrowserInstalled,
  reopenClosedTab,
  showNotInstalledToast,
} from "./lib/browser";
import { PRIVACY_ACCESSIBILITY_URL } from "./lib/constants";

export default async function ReopenClosedTabCommand() {
  if (!(await isSearchBrowserInstalled())) {
    await showNotInstalledToast();
    return;
  }

  try {
    await reopenClosedTab();
    await showHUD("Reopened Closed Tab in Search Browser");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to reopen closed tab",
      primaryAction: isAccessibilityPermissionError(error)
        ? {
            title: "Open Accessibility Settings",
            onAction: () => open(PRIVACY_ACCESSIBILITY_URL),
          }
        : undefined,
    });
  }
}
