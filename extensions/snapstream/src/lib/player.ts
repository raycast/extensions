import { exec } from "child_process";
import { open, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences } from "./types";

export async function openStream(streamUrl: string, channelName: string): Promise<void> {
  await showToast({ style: Toast.Style.Animated, title: `Opening ${channelName}...` });

  await open(streamUrl, "QuickTime Player");

  const preferences = getPreferenceValues<Preferences>();

  if (preferences.autoPip) {
    const delay = parseInt(preferences.pipDelay, 10) || 3;
    const appleScript = `osascript -e 'tell application "System Events" to tell process "QuickTime Player" to click menu item "Enter Picture in Picture" of menu "View" of menu bar 1'`;

    exec(`sleep ${delay} && ${appleScript}`, (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not enable Picture in Picture",
          message: "Enable it manually from the View menu. Check accessibility permissions.",
        });
        return;
      }

      showToast({ style: Toast.Style.Success, title: `Now playing: ${channelName}` });
    });
  } else {
    await showToast({ style: Toast.Style.Success, title: `Now playing: ${channelName}` });
  }
}
