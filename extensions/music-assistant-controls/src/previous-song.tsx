import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { getSelectedQueueID } from "./player-selection/use-selected-player-id";

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;
  try {
    const client = new MusicAssistantClient();
    await client.previous(selectedPlayerID);

    const player = await client.getPlayer(selectedPlayerID);

    await showToast({
      style: Toast.Style.Success,
      title: `⏮️ ${client.formatCurrentMediaTitle(player.current_media, "Previous song")}`,
    });
  } catch (error) {
    showFailureToast(error, {
      title: "💥 Something went wrong!",
    });
  }
}
