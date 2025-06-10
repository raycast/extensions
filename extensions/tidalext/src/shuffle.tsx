import { showHUD } from "@raycast/api";
import { sendCommand, getCurrentTrack } from "./lib/utils";

export default async function ShuffleCommand() {
  const track = await getCurrentTrack();

  const success = await sendCommand("toggleShuffle");
  if (success) {
    const status = track?.isShuffled ? "Off" : "On";
    await showHUD(`🔀 Shuffle: ${status}`);
  } else {
    await showHUD("❌ Failed to toggle shuffle");
  }
}
