import { LaunchType, closeMainWindow, launchCommand, showToast, Toast } from "@raycast/api";
import { toggleSystemAudioInputLevel, isWindows } from "./utils";

export default async function toggleMute() {
  await closeMainWindow();

  if (isWindows) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Windows Detected",
      message: "Toggling microphone via PowerShell...",
    });
  }

  await toggleSystemAudioInputLevel();

  if (!isWindows) {
    try {
      await launchCommand({ name: "mute-menu-bar", type: LaunchType.Background });
    } catch {
      console.log("mute-menu-bar command is not active");
    }
  }
}
