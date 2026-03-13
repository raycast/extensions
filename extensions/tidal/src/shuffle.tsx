import { showHUD } from "@raycast/api";
import { sendCommand, getCurrentTrack } from "./lib/utils";

export default async function ShuffleCommand() {
  const success = await sendCommand("toggleShuffle");

  if (success) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const updatedTrack = await getCurrentTrack();

    const status = updatedTrack?.isShuffled ? "Off" : "On";
    await showHUD(`🔀 Shuffle: ${status}`);
  } else {
    await showHUD("❌ Failed to toggle shuffle");
  }
}
