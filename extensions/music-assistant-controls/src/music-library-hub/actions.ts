import { showToast, Toast } from "@raycast/api";
import { MediaItemTypeOrItemMapping } from "../music-assistant/external-code/interfaces";
import MusicAssistantClient from "../music-assistant/music-assistant-client";
import { getSelectedQueueID } from "../player-selection/use-selected-player-id";

/**
 * Add an item to the selected queue and show standardized user feedback.
 */
export async function addItemToQueueNext(
  client: MusicAssistantClient,
  item: MediaItemTypeOrItemMapping,
  itemName: string,
  onSuccess?: () => void | Promise<void>,
): Promise<void> {
  const queueId = await getSelectedQueueID();
  if (!queueId) {
    return;
  }

  try {
    await client.addToQueueNext(item, queueId);
    await showToast({
      style: Toast.Style.Success,
      title: "Added to Queue",
      message: client.formatAddToQueueNextMessage(itemName),
    });
    await onSuccess?.();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Add to Queue",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
