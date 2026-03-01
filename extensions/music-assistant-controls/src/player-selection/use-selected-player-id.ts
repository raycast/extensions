import { showToast, launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { PlayerQueue } from "../music-assistant/external-code/interfaces";

export const selectedPlayerKey = "queue_id";
export type StoredQueue = Pick<PlayerQueue, "queue_id">;

/**
 * Read the stored queue object from local storage without UI side effects.
 * Used by menu bar flows where we do not want to show toasts during background/user-initiated launches.
 */
export async function getStoredQueue(): Promise<StoredQueue | undefined> {
  const storedObj = await LocalStorage.getItem<string>(selectedPlayerKey);
  if (!storedObj) return undefined;

  try {
    const parsed: StoredQueue = JSON.parse(storedObj);
    return parsed?.queue_id ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function storeSelectedQueueID(queue_id: string) {
  return LocalStorage.setItem(selectedPlayerKey, JSON.stringify({ queue_id }));
}

async function showNoPlayerSelectedToast() {
  await showToast({
    title: "😲 No player selected!",
    message: "Please select an active player first.",
    primaryAction: {
      title: "Set Active Player",
      onAction: async () => {
        try {
          await launchCommand({
            name: "set-active-player",
            type: LaunchType.UserInitiated,
          });
        } catch (error) {
          showFailureToast(error, {
            title: "Failed to launch set-active-player command",
          });
        }
      },
    },
  });
}

export async function getSelectedQueueID() {
  try {
    const selectedPlayerID = await getStoredQueue();

    if (!selectedPlayerID?.queue_id) {
      await showNoPlayerSelectedToast();
      return undefined;
    }

    return selectedPlayerID.queue_id;
  } catch {
    await showNoPlayerSelectedToast();
    return undefined;
  }
}
