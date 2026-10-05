/**
 * Raycast toast feedback for merge review overwrite toggles.
 */

import { showToast, Toast } from "@raycast/api";
import { getCameraDisplayName } from "../constants";
import { formatEventTitle } from "./format-event";
import { countExistingMergeableJobs, getMergeOutputKey } from "./merge-readiness";
import type { TeslaEvent } from "../types";

/**
 * Shows a toast after bulk overwrite/skip in a review scope.
 *
 * @param overwrite - Whether outputs were set to overwrite (`true`) or skip (`false`).
 * @param outputCount - Number of outputs affected.
 * @param scope - Human-readable scope label.
 */
export async function showOverwriteScopeFeedback(
  overwrite: boolean,
  outputCount: number,
  scope: string,
): Promise<void> {
  if (outputCount === 0) {
    await showToast({
      style: Toast.Style.Success,
      title: "No existing outputs",
      message: `Nothing to ${overwrite ? "overwrite" : "skip"} in ${scope}.`,
    });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: overwrite ? "Set to overwrite" : "Set to skip",
    message: `${outputCount} output${outputCount !== 1 ? "s" : ""} in ${scope}`,
  });
}

/**
 * Shows a toast after toggling overwrite for one camera on an event.
 *
 * @param event - Event whose camera was toggled.
 * @param camera - Camera id toggled.
 * @param overwriteKeys - Current overwrite key set (toggle is applied before this call).
 */
export async function showCameraOverwriteFeedback(
  event: TeslaEvent,
  camera: string,
  overwriteKeys: ReadonlySet<string>,
): Promise<void> {
  const key = getMergeOutputKey(event.eventDir, camera);
  const willOverwrite = !overwriteKeys.has(key);

  await showToast({
    style: Toast.Style.Success,
    title: willOverwrite ? "Overwrite" : "Skip",
    message: `${getCameraDisplayName(camera)} · ${formatEventTitle(event.folderName)}`,
  });
}

/**
 * Shows a toast after global overwrite/skip for all categories.
 *
 * @param overwrite - Global overwrite (`true`) or skip-all (`false`).
 * @param events - All events in the merge review session.
 */
export async function showGlobalOverwriteFeedback(overwrite: boolean, events: readonly TeslaEvent[]): Promise<void> {
  const outputCount = countExistingMergeableJobs(events);
  await showOverwriteScopeFeedback(overwrite, outputCount, "all categories");
}
