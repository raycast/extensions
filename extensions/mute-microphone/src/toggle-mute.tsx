import { runAppleScript } from "@raycast/utils";
import { launchCommand, LaunchType, closeMainWindow } from "@raycast/api";
import { toggleSystemAudioInputLevel } from "./utils";

export default async function toggleMute() {
  const currentAudioInputLevelString = await runAppleScript("input volume of (get volume settings)");
  const currentAudioInputLevel = isNaN(Number(currentAudioInputLevelString)) ? 0 : Number(currentAudioInputLevelString);
  await toggleSystemAudioInputLevel(currentAudioInputLevel);
  await launchCommand({ name: "mute-menu-bar", type: LaunchType.UserInitiated });
  await closeMainWindow();
}
