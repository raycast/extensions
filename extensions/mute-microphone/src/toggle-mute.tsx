import { runAppleScript } from "@raycast/utils";
import { launchCommand, LaunchType, closeMainWindow, showHUD } from "@raycast/api";
import { toggleSystemAudioInputLevel } from "./shared/utils";

export default async function toggleMute() {
  const currentAudioInputLevelString = await runAppleScript("input volume of (get volume settings)");
  if (currentAudioInputLevelString == "missing value") {
    await showHUD("Unsupported device");
    return;
  }
  const currentAudioInputLevel = isNaN(Number(currentAudioInputLevelString)) ? 0 : Number(currentAudioInputLevelString);
  await toggleSystemAudioInputLevel(currentAudioInputLevel);
  await launchCommand({ name: "mute-menu-bar", type: LaunchType.UserInitiated });
  await closeMainWindow();
}
