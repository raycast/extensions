import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { getSelectedQueueID } from "./use-selected-player-id";

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;
  try {
    await new MusicAssistantClient().togglePlayPause(selectedPlayerID);
  } catch (error) {
    showFailureToast(error, {
      title: "💥 Something went wrong!",
    });
  }
}
