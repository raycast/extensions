import { showHUD, launchCommand, LaunchType } from "@raycast/api";
import { toggleMicrophone } from "./lib/mic-utils";

export default async function Command() {
  try {
    await toggleMicrophone();
    // Refresh the menu bar command to update its state
    await launchCommand({ name: "toggle-microphone-on-off", type: LaunchType.Background });
  } catch (error) {
    console.error("Failed to toggle microphone:", error);
    await showHUD("❌ Failed to toggle microphone");
  }
}
