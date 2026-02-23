import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { getSelectedQueueID } from "./use-selected-player-id";

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;
  try {
    const client = new MusicAssistantClient();
    await client.next(selectedPlayerID);

    // Get the current song from the player's media info
    const player = await client.getPlayer(selectedPlayerID);
    const currentMedia = player.current_media;
    const title = currentMedia?.title || "Next song";
    const artist = currentMedia?.artist || "";
    const displayTitle = artist ? `${title} - ${artist}` : title;

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: `⏭️ ${displayTitle}`,
    });
  } catch (error) {
    showFailureToast(error, {
      title: "💥 Something went wrong!",
    });
  }
}
