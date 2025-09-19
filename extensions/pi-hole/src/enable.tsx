import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { PiHoleAPI } from "./api/pihole";
import { getPreferences } from "./utils/preferences";

export default async function EnableCommand() {
  const preferences = getPreferences();
  const api = new PiHoleAPI(preferences.piholeUrl, preferences.apiToken);

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Enabling Pi-hole...",
    });

    await api.enable();

    await showToast({
      style: Toast.Style.Success,
      title: "Pi-hole Enabled",
      message: "DNS blocking is now active",
    });

    await closeMainWindow();
  } catch (error) {
    showFailureToast(error, { title: "Failed to Enable Pi-hole" });
  }
}
