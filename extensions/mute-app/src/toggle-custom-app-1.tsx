import { getPreferenceValues, showToast, Toast, closeMainWindow } from "@raycast/api";
import { toggleMuteByProcessName } from "./utils/toggleMuteByProcessName";

interface Preferences {
  processName: string;
  showToast: boolean;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const processName = preferences.processName.trim();
  const shouldShowToast = preferences.showToast;

  if (!processName) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Process name not configured",
      message: "Please configure the process name in extension preferences",
    });
    return;
  }

  try {
    await closeMainWindow();
    await toggleMuteByProcessName(processName);

    if (shouldShowToast) {
      await showToast({
        style: Toast.Style.Success,
        title: "Toggled mute",
        message: processName,
      });
    }
  } catch (error) {
    if (shouldShowToast) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle mute",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
