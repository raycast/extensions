import { showToast, Toast, closeMainWindow, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { PiHoleAPI } from "./api/pihole";
import { getPreferences } from "./utils/preferences";

interface Arguments {
  duration: string;
}

export default async function DisableTimeCommand(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { duration } = props.arguments;
  const preferences = getPreferences();
  const api = new PiHoleAPI(preferences.piholeUrl, preferences.apiToken);

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Disabling Pi-hole...",
      message: `For ${duration}`,
    });

    await api.disable({ duration });

    await showToast({
      style: Toast.Style.Success,
      title: "Pi-hole Disabled",
      message: `DNS blocking disabled for ${duration}`,
    });

    await closeMainWindow();
  } catch (error) {
    showFailureToast(error, { title: "Failed to Disable Pi-hole" });
  }
}
