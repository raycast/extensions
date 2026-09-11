import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { getSelectedQueueID } from "./player-selection/use-selected-player-id";

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;

  const client = new MusicAssistantClient();
  const controller = await client.createVolumeController(selectedPlayerID);
  await controller.toggleMute();
}
