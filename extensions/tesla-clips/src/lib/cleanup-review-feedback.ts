/**
 * Raycast toast feedback for cleanup review selection changes.
 */

import { showToast, Toast } from "@raycast/api";

/**
 * Shows a toast after bulk include/exclude in cleanup review.
 *
 * @param include - Whether events were included (`true`) or excluded (`false`) for removal.
 * @param eventCount - Number of events affected.
 * @param scope - Human-readable scope label (for example a day or category name).
 */
export async function showCleanupSelectionFeedback(include: boolean, eventCount: number, scope: string): Promise<void> {
  if (eventCount === 0) {
    await showToast({
      style: Toast.Style.Animated,
      title: "No clips",
      message: `Nothing to ${include ? "include" : "exclude"} in ${scope}.`,
    });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: include ? "Included for removal" : "Excluded from removal",
    message: `${eventCount} clip${eventCount !== 1 ? "s" : ""} in ${scope}`,
  });
}
