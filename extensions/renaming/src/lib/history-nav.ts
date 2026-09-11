/**
 * Shared record-and-navigate flow for the rename commands: save the completed
 * batch to history without letting a storage failure taint the rename result,
 * then land the user in Rename History (or fall back to the root search).
 */

import { launchCommand, LaunchType, popToRoot } from "@raycast/api";
import type { RenameHistoryEntry } from "../types";
import { saveToHistory } from "./history";
import { log } from "./logger";

/**
 * Record a completed batch. Returns whether history was actually saved — a
 * storage failure is logged and swallowed so the rename itself still reports
 * success; callers reflect the false return in their toast instead.
 */
export async function recordRenameHistory(
  description: string,
  operations: RenameHistoryEntry["operations"],
): Promise<boolean> {
  if (operations.length === 0) return false;
  try {
    await saveToHistory(description, operations);
    return true;
  } catch (error) {
    log.rename.error("Failed to save rename history", error);
    return false;
  }
}

/**
 * Land in Rename History so the completed batch is reviewable and undoable.
 * When history wasn't saved (or the command can't launch), pop to root
 * instead — opening a history view that doesn't show the batch would only
 * confuse. No popToRoot before launching — its pop resolves after the launch
 * and would yank the user straight back to the root search.
 */
export async function openRenameHistory(historySaved: boolean): Promise<void> {
  if (!historySaved) {
    await popToRoot();
    return;
  }
  try {
    await launchCommand({ name: "history", type: LaunchType.UserInitiated });
  } catch (error) {
    log.rename.error("Failed to launch the history command", error);
    await popToRoot();
  }
}
