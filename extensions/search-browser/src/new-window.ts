import { open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  createNewWindow,
  isAccessibilityPermissionError,
  isSearchBrowserInstalled,
  showNotInstalledToast,
} from "./lib/browser";
import { PRIVACY_ACCESSIBILITY_URL } from "./lib/constants";

export default async function NewWindowCommand() {
  if (!(await isSearchBrowserInstalled())) {
    await showNotInstalledToast();
    return;
  }

  try {
    await createNewWindow();
    await showHUD("Opened New Window in Search Browser");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to open new window",
      primaryAction: isAccessibilityPermissionError(error)
        ? {
            title: "Open Accessibility Settings",
            onAction: () => open(PRIVACY_ACCESSIBILITY_URL),
          }
        : undefined,
    });
  }
}
