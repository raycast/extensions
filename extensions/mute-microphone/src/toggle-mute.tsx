import { LaunchType, closeMainWindow, launchCommand } from "@raycast/api";
import { get, toggleSystemAudioInputLevel } from "./utils";

export default async function toggleMute() {
  const currentAudioInputLevel = await get();
  await closeMainWindow();
  await toggleSystemAudioInputLevel(Number(currentAudioInputLevel));

  try {
    await launchCommand({ name: "mute-menu-bar", type: LaunchType.Background });
  } catch {
    console.log("mute-menu-bar command is not active");
  }
}
