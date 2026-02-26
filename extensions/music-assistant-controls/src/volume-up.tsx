import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { getSelectedQueueID } from "./player-selection/use-selected-player-id";

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;

  try {
    const client = new MusicAssistantClient();

    // Get the selected player
    const selectedPlayer = await client.getPlayer(selectedPlayerID);

    // Check if we should use group volume (for group leaders with members)
    const useGroupVolume = client.shouldUseGroupVolume(selectedPlayer);

    // Get volume before
    const volumeBefore = useGroupVolume ? (selectedPlayer.group_volume ?? 0) : (selectedPlayer.volume_level ?? 0);

    // Execute volume up
    if (useGroupVolume) {
      await client.groupVolumeUp(selectedPlayer.player_id);
    } else {
      const volumeControlPlayerId = client.getVolumeControlPlayer(selectedPlayer);
      if (!volumeControlPlayerId) {
        throw new Error("Unable to determine volume control target");
      }
      await client.volumeUp(volumeControlPlayerId);
    }

    // Get volume after
    const playerAfter = await client.getPlayer(selectedPlayerID);
    const volumeAfter = useGroupVolume ? (playerAfter.group_volume ?? 0) : (playerAfter.volume_level ?? 0);

    await showToast({
      style: Toast.Style.Success,
      title: `🔊 ${client.formatVolumeTransition(volumeBefore, volumeAfter)}`,
    });
  } catch (error) {
    showFailureToast(error, {
      title: "💥 Something went wrong!",
    });
  }
}
