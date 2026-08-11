import {
  Toast,
  closeMainWindow,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export const fastForward = (seconds: number) => `(function() {
  const video = document.querySelector('video');
  if (!video) {
    return "fast-forward-video-not-found";
  }

  try {
    video.currentTime += ${seconds};
    return "fast-forward-success";
  } catch (e) {
    return "fast-forward-error";
  }
})();`;

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
  try {
    const result = await runJSInYouTubeMusicTab(fastForward(seconds));
    switch (result) {
      case "fast-forward-video-not-found":
        await showHUD("❌ Video not found");
        break;
      case "fast-forward-success":
        await showHUD(`⏩ Fast forwarded ${seconds} seconds`);
        break;
      case "fast-forward-error":
        await showHUD("❌ Error fast forwarding");
        break;
      default:
        await showHUD(`❌ Unknown Error: ${result}`);
    }
    // allow ability to find particular spot
    setTimeout(closeMainWindow, 500);
  } catch (error) {
    // do nothing if error is thrown because it will be handled by the toast
  }
};
