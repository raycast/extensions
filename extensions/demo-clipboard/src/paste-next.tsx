import { Clipboard, showToast, Toast, showHUD } from "@raycast/api";
import { loadQueue, saveQueue } from "./storage";
import { getCurrentItem, advancePosition } from "./utils/queue-operations";

export default async function Command() {
  try {
    const queue = await loadQueue();
    const currentItem = getCurrentItem(queue);

    if (!currentItem) {
      await showToast({
        style: Toast.Style.Failure,
        title: queue.items.length === 0 ? "Queue is empty" : "End of queue",
        message:
          queue.items.length === 0
            ? "Add items in 'Manage Demo Queue'"
            : "Press Cmd+R in 'Manage Demo Queue' to reset to top",
      });
      return;
    }

    if (!currentItem.text.trim()) {
      const updatedQueue = advancePosition(queue);
      await saveQueue(updatedQueue);
      await showToast({
        style: Toast.Style.Success,
        title: "Skipped empty item",
        message: `Advanced to item ${updatedQueue.currentPosition + 1}`,
      });
      return;
    }

    await Clipboard.paste(currentItem.text);
    const updatedQueue = advancePosition(queue);
    await saveQueue(updatedQueue);

    const position = updatedQueue.currentPosition;
    const total = updatedQueue.items.length;
    const remaining = total - position;

    await showHUD(`✓ Pasted item ${position}/${total}${remaining > 0 ? ` • ${remaining} remaining` : " • Done!"}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Paste failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
