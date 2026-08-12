/**
 * Pre-merge confirmation dialogs for destructive merge options.
 */

import { confirmAlert } from "@raycast/api";
import type { MergeOptions } from "../types";

/**
 * Confirms trashing source segments when that option is enabled.
 *
 * @param mergeOptions - Active merge options; no prompt when delete-after-merge is off.
 * @returns `true` when merge may proceed (user confirmed or option disabled).
 */
export async function confirmDeleteSourceSegments(mergeOptions: MergeOptions): Promise<boolean> {
  if (!mergeOptions.deleteSourceSegmentsAfterMerge) {
    return true;
  }

  return confirmAlert({
    title: "Delete Source Clips After Merge?",
    message: "Original split clips will be moved to Trash after successful merge. This cannot be undone easily.",
    primaryAction: { title: "Merge & Trash Sources" },
  });
}
