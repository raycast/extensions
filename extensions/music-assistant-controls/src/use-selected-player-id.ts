import { showToast, launchCommand, LaunchType, LocalStorage } from "@raycast/api";

export const selectedPlayerKey = "queue_id";
export type StoredQueue = { queue_id: string };
export async function storeSelectedQueueID(queue_id: string) {
  return LocalStorage.setItem(selectedPlayerKey, JSON.stringify({ queue_id }));
}

export async function getSelectedQueueID() {
  try {
    const storedObj = await LocalStorage.getItem<string>(selectedPlayerKey);
    const selectedPlayerID: StoredQueue = storedObj ? JSON.parse(storedObj) : null;
    return selectedPlayerID.queue_id;
  } catch {
    showToast({
      title: "😲 No player selected!",
      message: "Please select an active player first.",
      primaryAction: {
        title: "Set Active Player",
        onAction: () =>
          launchCommand({
            name: "set-active-player",
            type: LaunchType.UserInitiated,
          }),
      },
    });
    return undefined;
  }
}
