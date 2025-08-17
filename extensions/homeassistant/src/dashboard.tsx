import { ha } from "@lib/common";
import { getPreferenceValues, popToRoot, showHUD, open, showToast, Toast } from "@raycast/api";
import urljoin from "url-join";

function getDashboardPath(): string {
  const prefs = getPreferenceValues();
  return prefs.dashboardpath || "";
}

export default async function Command() {
  try {
    const path = getDashboardPath();
    const baseUrl = ha.preferCompanionApp ? ha.navigateUrl("") : await ha.nearestDefinedURL();

    if (!baseUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open dashboard",
        message: "Could not determine Home Assistant URL",
      });
      return;
    }
    await open(urljoin(baseUrl, path));
    await showHUD("Open Dashboard");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open dashboard",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  } finally {
    await popToRoot();
  }
}
