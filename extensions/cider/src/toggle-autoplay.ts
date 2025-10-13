import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { callCider } from "./functions";

interface Preferences {
  exitOnSuccess: boolean;
}

export default async function Command() {
  const { exitOnSuccess } = getPreferenceValues<Preferences>();
  try {
    await callCider("/playback/toggle-autoplay", "POST");
    if (exitOnSuccess) await showHUD("♾️ Toggled Autoplay");
    else
      await showToast({
        style: Toast.Style.Success,
        title: "Toggled Autoplay",
      });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't connect to Cider",
      message: "Make sure Cider is running and try again.",
    });
  }
}
