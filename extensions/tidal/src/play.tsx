import { showHUD } from "@raycast/api";
import { sendCommand, getCurrentTrack } from "./lib/utils";

export default async function PlayCommand() {
  const track = await getCurrentTrack();

  if (!track) {
    await showHUD("❌ No track data available");
    return;
  }

  if (track.isPlaying) {
    await showHUD("▶️ Already playing");
    return;
  }

  const success = await sendCommand("play");
  if (success) {
    await showHUD(`▶️ Playing: ${track.title}`);
  } else {
    await showHUD("❌ Failed to play");
  }
}
