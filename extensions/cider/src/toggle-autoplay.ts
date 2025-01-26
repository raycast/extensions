import fetch from "cross-fetch";
import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";

interface Preferences {
  exitOnSuccess: boolean;
}

export default async function Command() {
  const { exitOnSuccess } = getPreferenceValues<Preferences>();
  try {
    await fetch("http://localhost:10767/api/v1/playback/toggle-autoplay", {
      method: "POST",
    });
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
