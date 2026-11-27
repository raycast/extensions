import { Clipboard, Toast, open, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  getFocusedTab,
  isAutomationPermissionError,
  isSearchBrowserInstalled,
  showNotInstalledToast,
} from "./lib/browser";
import { PRIVACY_AUTOMATION_URL } from "./lib/constants";

export default async function CopyCurrentTabCommand() {
  if (!(await isSearchBrowserInstalled())) {
    await showNotInstalledToast();
    return;
  }

  try {
    const tab = await getFocusedTab();
    if (!tab) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No active tab found",
        message: "Open a non-private tab in Search Browser first.",
      });
      return;
    }

    await Clipboard.copy(tab.url);
    await showHUD(`Copied ${tab.title}`);
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to copy current tab URL",
      primaryAction: isAutomationPermissionError(error)
        ? {
            title: "Open Automation Settings",
            onAction: () => open(PRIVACY_AUTOMATION_URL),
          }
        : undefined,
    });
  }
}
