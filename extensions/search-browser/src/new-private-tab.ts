import { open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  createNewPrivateTab,
  isAccessibilityPermissionError,
  isSearchBrowserInstalled,
  showNotInstalledToast,
} from "./lib/browser";
import { PRIVACY_ACCESSIBILITY_URL } from "./lib/constants";

export default async function NewPrivateTabCommand() {
  if (!(await isSearchBrowserInstalled())) {
    await showNotInstalledToast();
    return;
  }

  try {
    await createNewPrivateTab();
    await showHUD("Opened New Private Tab in Search Browser");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to open private tab",
      primaryAction: isAccessibilityPermissionError(error)
        ? {
            title: "Open Accessibility Settings",
            onAction: () => open(PRIVACY_ACCESSIBILITY_URL),
          }
        : undefined,
    });
  }
}
