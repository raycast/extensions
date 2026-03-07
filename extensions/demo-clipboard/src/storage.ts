import { LocalStorage } from "@raycast/api";
import { QueueState } from "./types";
import { createEmptyQueue } from "./utils/queue-operations";

const STORAGE_KEY = "demo-clipboard-queue";
const CURRENT_VERSION = 1;

/**
 * Load the queue from LocalStorage
 * Returns an empty queue if storage is empty or invalid
 */
export async function loadQueue(): Promise<QueueState> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);

    if (!stored) {
      return createEmptyQueue();
    }

    const parsed: QueueState = JSON.parse(stored);

    if (parsed.version === CURRENT_VERSION && Array.isArray(parsed.items)) {
      // Ensure currentPosition exists for backward compatibility
      if (typeof parsed.currentPosition !== "number") {
        parsed.currentPosition = 0;
      }
      return parsed;
    }

    // Invalid or old version, return empty queue
    console.warn("Invalid queue data or old version, resetting to empty queue");
    return createEmptyQueue();
  } catch (error) {
    console.error("Failed to load queue:", error);
    return createEmptyQueue();
  }
}

/**
 * Save the queue to LocalStorage
 */
export async function saveQueue(queue: QueueState): Promise<void> {
  try {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to save queue:", error);
    throw error;
  }
}
