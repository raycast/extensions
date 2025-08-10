import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";
import { getPreferences } from "./infra/preference";

export default async (closeWindow = true) => {
  const seconds = getPreferences().ffRewSeconds;

  if (await runJSInYouTubeMusicTab(`document.querySelector('video').currentTime -= ${seconds};`)) {
    // allow ability to find particular spot
    if (closeWindow) {
      setTimeout(closeMainWindow, 500);
    }
  }
};
