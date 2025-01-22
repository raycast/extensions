import { showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { getItems, updateItem } from "./storage";
import { Item, EnhancedItem } from "./types";
import { showFailureToast } from "@raycast/utils";

export async function hasTimerRunning() {
  const items = await getItems();
  return items.some((item: Item) => !item.end);
}

export async function getRunningItem() {
  const items = await getItems();
  const lastStoppedItem = items.find((item) => item.end === undefined);
  if (!lastStoppedItem) return null;

  return lastStoppedItem;
}

export function getLastStoppedFast(data: Item[] | undefined): {
  lastStoppedItem: Item | null;
  hoursSinceStopped: number | null;
} {
  const lastStoppedItem = data?.find((item) => item.end !== undefined);
  if (!lastStoppedItem?.end) return { lastStoppedItem: null, hoursSinceStopped: null };

  const lastEndTime = new Date(lastStoppedItem.end);
  const now = new Date();
  const hoursSinceStopped = Math.floor((now.getTime() - lastEndTime.getTime()) / (1000 * 60 * 60));

  return { lastStoppedItem, hoursSinceStopped };
}

export function formatTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString(
    undefined,
    options ?? {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
  );
}

export async function stopTimer(item: Item, revalidate: () => Promise<EnhancedItem[]>) {
  try {
    const end = new Date();
    await updateItem(item.id!, { ...item, end });
    await showToast({ title: "Timer stopped", style: Toast.Style.Success });
    return revalidate();
  } catch (error) {
    await showToast({
      title: "Failed to stop timer",
      message: error instanceof Error ? error.message : "Unknown error",
      style: Toast.Style.Failure,
    });
    return []; // Return an empty array in case of error
  } finally {
    try {
      await launchCommand({ name: "menubar", type: LaunchType.Background });
    } catch (error) {
      showFailureToast(error, { title: "Failed to run menubar" });
    }
  }
}
