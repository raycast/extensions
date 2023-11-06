import { launchCommand, LaunchType, closeMainWindow } from "@raycast/api";
import { getCurrentAudioInputLevel, toggleSystemAudioInputLevel } from "./shared/utils";

export default async function toggleMute() {
  const currentAudioInputLevel = getCurrentAudioInputLevel();
  await closeMainWindow();
  await toggleSystemAudioInputLevel(currentAudioInputLevel);

  try {
    await launchCommand({ name: "mute-menu-bar", type: LaunchType.Background });
  } catch {
    console.log("mute-menu-bar command is not active");
  }
}
