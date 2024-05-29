import { LaunchType, closeMainWindow, launchCommand } from "@raycast/api";
import { toggleSystemAudioInputLevel } from "./utils";

export default async function toggleMute() {
  await closeMainWindow();
  await toggleSystemAudioInputLevel();

  try {
    await launchCommand({ name: "mute-menu-bar", type: LaunchType.UserInitiated });
  } catch {
    console.log("mute-menu-bar command is not active");
  }
}
