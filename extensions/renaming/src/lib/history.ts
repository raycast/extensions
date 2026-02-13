/**
 * Undo/History system for rename operations
 */

import { LocalStorage, showToast, Toast } from "@raycast/api";
import { rename } from "fs/promises";
import { basename } from "path";
import type { RenameHistoryEntry } from "../types";
import { fileExists } from "./files";
import { MAX_HISTORY_ENTRIES, STORAGE_KEYS } from "./constants";
import { getUserFriendlyErrorMessage } from "./errors";
import { log } from "./logger";

/**
 * Get all history entries
 */
export async function getHistory(): Promise<RenameHistoryEntry[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.HISTORY);
  if (!data) return [];

  try {
    return JSON.parse(data) as RenameHistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Get the number of undo operations available
 */
export async function getUndoCount(): Promise<number> {
  const history = await getHistory();
  return history.length;
}

/**
 * Save a rename operation to history (call AFTER successful rename)
 */
export async function saveToHistory(description: string, operations: RenameHistoryEntry["operations"]): Promise<void> {
  log.history.info("Saving to history", { description, operationCount: operations.length });
  const history = await getHistory();

  history.unshift({
    timestamp: Date.now(),
    description,
    operations,
  });

  // Trim to max entries
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.length = MAX_HISTORY_ENTRIES;
  }

  await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

/**
 * Undo the last rename operation
 * Returns true if successful, false if nothing to undo or failed
 */
export async function undoLastRename(): Promise<boolean> {
  const history = await getHistory();

  if (history.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to Undo",
      message: "No rename operations in history",
    });
    return false;
  }

  const lastEntry = history[0]!;
  const errors: string[] = [];
  log.history.info("Undoing last rename", { description: lastEntry.description });

  // Reverse the operations (in reverse order)
  for (const op of [...lastEntry.operations].reverse()) {
    // Check if renamed file exists
    if (!(await fileExists(op.newPath))) {
      errors.push(`${basename(op.newPath)} not found`);
      continue;
    }

    // Check if original path is free
    if (await fileExists(op.oldPath)) {
      errors.push(`${basename(op.oldPath)} already exists`);
      continue;
    }

    try {
      await rename(op.newPath, op.oldPath);
    } catch (error) {
      log.history.error("Undo failed for file", { newPath: op.newPath, oldPath: op.oldPath, error });
      errors.push(`Failed to restore ${basename(op.oldPath)}`);
    }
  }

  // Remove this entry from history
  const newHistory = history.slice(1);
  await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));

  if (errors.length === 0) {
    await showToast({
      style: Toast.Style.Success,
      title: "Undo Successful",
      message: `Reverted: ${lastEntry.description}`,
    });
    return true;
  } else if (errors.length < lastEntry.operations.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Partial Undo",
      message: errors.slice(0, 2).join("; "),
    });
    return true;
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Undo Failed",
      message: errors.slice(0, 2).join("; "),
    });
    return false;
  }
}

/**
 * Undo to a specific point in history (undo multiple operations)
 */
export async function undoToPoint(index: number): Promise<boolean> {
  const history = await getHistory();

  if (index >= history.length) {
    return false;
  }

  const errors: string[] = [];
  let successCount = 0;
  let totalOperations = 0;

  // Undo from newest to the target index (inclusive)
  for (let i = 0; i <= index; i++) {
    const entry = history[i]!;

    for (const op of [...entry.operations].reverse()) {
      totalOperations++;

      if (!(await fileExists(op.newPath))) {
        errors.push(`${basename(op.newPath)} not found`);
        continue;
      }

      if (await fileExists(op.oldPath)) {
        errors.push(`${basename(op.oldPath)} already exists`);
        continue;
      }

      try {
        await rename(op.newPath, op.oldPath);
        successCount++;
      } catch (error) {
        log.history.error("Undo to point failed for file", { newPath: op.newPath, oldPath: op.oldPath, error });
        errors.push(`Failed to restore ${basename(op.oldPath)}: ${getUserFriendlyErrorMessage(error)}`);
      }
    }
  }

  // Remove all undone entries from history
  const newHistory = history.slice(index + 1);
  await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));

  const operationsText = `${index + 1} operation${index > 0 ? "s" : ""}`;

  if (errors.length === 0) {
    await showToast({
      style: Toast.Style.Success,
      title: "Undo Successful",
      message: `Reverted ${operationsText} (${successCount} files)`,
    });
    return true;
  } else if (successCount > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Partial Undo",
      message: `Reverted ${successCount}/${totalOperations} files. ${errors.slice(0, 2).join("; ")}`,
    });
    return true;
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Undo Failed",
      message: errors.slice(0, 2).join("; "),
    });
    return false;
  }
}

/**
 * Clear all history
 */
export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.HISTORY);
}

/**
 * Format a history entry for display
 */
export function formatHistoryEntry(entry: RenameHistoryEntry): string {
  const date = new Date(entry.timestamp);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${time} - ${entry.description}`;
}
