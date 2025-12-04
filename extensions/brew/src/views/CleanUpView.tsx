/**
 * Clean up command for removing old brew files and packages.
 */

import { brewCleanup, preferences, showActionToast } from "../utils";

export default async (): Promise<void> => {
  const handle = showActionToast({
    title: "Cleaning files & packages from the cache" + String.ellipsis,
    message: "Removing old versions...",
    cancelable: true,
  });
  try {
    await brewCleanup(preferences.withoutThreshold, handle.abort);
    await handle.showSuccessHUD("Cleanup completed");
  } catch {
    await handle.showFailureHUD("Cleanup failed");
  }
};
