import { Toast, closeMainWindow, getPreferenceValues, openExtensionPreferences, showToast } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  const secValue = getPreferenceValues<{ "ff-rew-seconds": string }>()["ff-rew-seconds"];
  if (secValue === "" || Number.isNaN(parseInt(secValue, 10))) {
    showToast({
      title: "Invalid seconds value",
      message: "Please set a valid number of seconds",
      style: Toast.Style.Failure,
      primaryAction: {
        onAction: openExtensionPreferences,
        title: "Set seconds",
      },
    });
    return;
  }
  const seconds = parseInt(secValue, 10);
  if (await runJSInYouTubeMusicTab(`document.querySelector('video').currentTime -= ${seconds};`)) {
    // allow ability to find particular spot
    setTimeout(closeMainWindow, 500);
  }
};
