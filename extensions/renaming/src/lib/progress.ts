/**
 * Progress tracking utilities for batch operations
 */

import { showToast, Toast } from "@raycast/api";
import { batchRename } from "./files";
import { BATCH_PROGRESS_THRESHOLD } from "./constants";
import type { RenameOperation, RenameResult } from "../types";

export interface BatchOperationOptions {
  /** The action being performed (e.g., "Renaming", "Replacing") */
  actionName: string;
  /** Label for items being operated on (default: "file") */
  itemLabel?: string;
}

export interface BatchOperationResult {
  results: RenameResult[];
  successCount: number;
  failCount: number;
  successfulOps: Array<{ oldPath: string; newPath: string }>;
}

/**
 * Execute batch rename with progress tracking and toast feedback
 */
export async function withProgress(
  operations: RenameOperation[],
  options: BatchOperationOptions,
): Promise<BatchOperationResult> {
  const { actionName } = options;

  const results = await batchRename(operations, async (current, total, fileName) => {
    if (total >= BATCH_PROGRESS_THRESHOLD) {
      await showToast({
        style: Toast.Style.Animated,
        title: `${actionName} ${current} of ${total}`,
        message: fileName,
      });
    }
  });

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const successfulOps = results.filter((r) => r.success).map((r) => ({ oldPath: r.oldPath, newPath: r.newPath }));

  const result = {
    results,
    successCount,
    failCount,
    successfulOps,
  };

  // Replace the animated toast with a completion toast
  const PAST_TENSE_MAP: Record<string, string> = {
    Renaming: "Renamed",
    Replacing: "Replaced",
    Copying: "Copied",
    Moving: "Moved",
    Deleting: "Deleted",
  };
  const pastTense =
    PAST_TENSE_MAP[actionName] ??
    (actionName.endsWith("ying")
      ? actionName.slice(0, -4) + "ied"
      : actionName.endsWith("ing")
        ? actionName.slice(0, -3) + "ed"
        : actionName);
  await showResultToast(result, pastTense, options.itemLabel);

  return result;
}

/**
 * Show appropriate toast based on operation results
 */
export async function showResultToast(
  result: BatchOperationResult,
  actionPastTense: string,
  itemLabel: string = "file",
): Promise<void> {
  const { results, successCount, failCount } = result;

  if (failCount === 0) {
    await showToast({
      style: Toast.Style.Success,
      title: `${actionPastTense} ${successCount} ${itemLabel}${successCount !== 1 ? "s" : ""}`,
      message: "Press ⌘Z to undo",
    });
  } else {
    const failedResults = results.filter((r) => !r.success);
    const firstError = failedResults[0]?.error || "Unknown error";

    await showToast({
      style: Toast.Style.Failure,
      title: `${actionPastTense} ${successCount}/${results.length} — ${failCount} failed`,
      message: firstError,
    });
  }
}
