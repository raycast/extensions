import { showHUD } from "@raycast/api";
import { sendCommand, getCurrentTrack } from "./lib/utils";

export default async function LikeCommand() {
  const track = await getCurrentTrack();

  if (!track) {
    await showHUD("❌ No track data available");
    return;
  }

  const success = await sendCommand("toggleLike");
  if (success) {
    const action = track.isLiked ? "Removed from" : "Added to";
    await showHUD(`${track.isLiked ? "💔" : "❤️"} ${action} favorites: ${track.title}`);
  } else {
    await showHUD("❌ Failed to toggle like");
  }
}
