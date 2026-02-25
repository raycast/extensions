import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { getSelectedQueueID } from "./use-selected-player-id";

const DEFAULT_UNMUTE_VOLUME = 10;

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;

  try {
    const client = new MusicAssistantClient();

    // Get current player
    const player = await client.getPlayer(selectedPlayerID);
    
    if (!client.supportsMuteControl(player)) {
      // Fallback: use volume control to simulate mute
      const currentVolume = player.volume_level ?? 0;
      
      if (currentVolume > 0) {
        // Mute by setting volume to 0
        await client.setVolume(selectedPlayerID, 0);
        await showToast({
          style: Toast.Style.Success,
          title: "🔇",
        });
      } else {
        // Unmute by setting volume to a default level
        await client.setVolume(selectedPlayerID, DEFAULT_UNMUTE_VOLUME);
        await showToast({
          style: Toast.Style.Success,
          title: "🔊",
        });
      }
      return;
    }

    // Get current mute state
    const mutedBefore = player.volume_muted ?? false;

    // Toggle mute state
    await client.volumeMute(selectedPlayerID, !mutedBefore);

    // Get new mute state after
    const playerAfter = await client.getPlayer(selectedPlayerID);
    const mutedAfter = playerAfter.volume_muted ?? false;

    // Show success toast with icon
    const icon = mutedAfter ? "🔇" : "🔊";

    await showToast({
      style: Toast.Style.Success,
      title: icon,
    });
  } catch (error) {
    showFailureToast(error, {
      title: "💥 Something went wrong!",
    });
  }
}
