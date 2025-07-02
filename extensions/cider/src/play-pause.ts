import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { callCider } from "./functions";

interface Preferences {
  exitOnSuccess: boolean;
}

export default async function Command() {
  const { exitOnSuccess } = getPreferenceValues<Preferences>();
  try {
    await callCider("/playback/playpause", "POST");
    if (exitOnSuccess) await showHUD("⏯️ Toggled Play/Pause");
    else
      await showToast({
        style: Toast.Style.Success,
        title: "Toggled Play/Pause",
      });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't Connect to Cider",
      message: "Make sure Cider is running and try again.",
    });
  }
}
