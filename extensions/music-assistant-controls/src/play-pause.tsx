import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { getSelectedQueueID } from "./use-selected-player-id";
import { PlayerState } from "./external-code/interfaces";

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;

  try {
    const client = new MusicAssistantClient();

    // Execute play/pause toggle and get updated state
    await client.togglePlayPause(selectedPlayerID);

    // Get new state after
    const playerAfter = await client.getPlayer(selectedPlayerID);
    const stateAfter = playerAfter.state;

    // Show success toast with appropriate message
    const emoji = stateAfter === PlayerState.PLAYING ? "▶️" : "⏸️";
    const message = stateAfter === PlayerState.PLAYING ? "Playing" : "Paused";
    await showToast({
      style: Toast.Style.Success,
      title: `${emoji} ${message}`,
    });
  } catch (error) {
    showFailureToast(error, {
      title: "💥 Something went wrong!",
    });
  }
}
