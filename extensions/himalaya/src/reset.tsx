import { LocalStorage, showToast, Toast } from "@raycast/api";

/**
 * Reset command to wipe all local storage data
 * This is a no-view command that will reset all cached data
 */
export default async function Command() {
  try {
    // Show progress toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Resetting storage...",
    });

    // Reset all local storage items
    await LocalStorage.clear();

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Storage reset",
      message: "All cached data has been successfully reset",
    });
  } catch (error) {
    // Show error toast
    console.error("Error resetting storage:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to reset storage",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
