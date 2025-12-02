import { showHUD } from "@raycast/api";
import { sendCommand, getCurrentTrack } from "./lib/utils";

export default async function PauseCommand() {
  const track = await getCurrentTrack();

  if (!track) {
    await showHUD("❌ No track data available");
    return;
  }

  if (!track.isPlaying) {
    await showHUD("⏸️ Already paused");
    return;
  }

  const success = await sendCommand("pause");
  if (success) {
    await showHUD(`⏸️ Paused: ${track.title}`);
  } else {
    await showHUD("❌ Failed to pause");
  }
}
