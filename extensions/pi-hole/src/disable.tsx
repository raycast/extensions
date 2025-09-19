import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { PiHoleAPI } from "./api/pihole";
import { getPreferences } from "./utils/preferences";

export default async function DisableCommand() {
  const preferences = getPreferences();
  const api = new PiHoleAPI(preferences.piholeUrl, preferences.apiToken);

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Disabling Pi-hole...",
    });

    await api.disable();

    await showToast({
      style: Toast.Style.Success,
      title: "Pi-hole Disabled",
      message: "DNS blocking is now inactive",
    });

    await closeMainWindow();
  } catch (error) {
    showFailureToast(error, { title: "Failed to Disable Pi-hole" });
  }
}
