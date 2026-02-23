import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { getSelectedQueueID } from "./use-selected-player-id";

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;

  try {
    const client = new MusicAssistantClient();

    // Get current volume before
    const playerBefore = await client.getPlayer(selectedPlayerID);
    const volumeBefore = playerBefore.volume_level ?? 0;

    // Execute volume down
    await client.volumeDown(selectedPlayerID);

    // Get new volume after
    const playerAfter = await client.getPlayer(selectedPlayerID);
    const volumeAfter = playerAfter.volume_level ?? 0;

    // Show success toast with transition
    await showToast({
      style: Toast.Style.Success,
      title: `🔉 Volume ${volumeBefore}% → ${volumeAfter}%`,
    });
  } catch (error) {
    showFailureToast(error, {
      title: "💥 Something went wrong!",
    });
  }
}
