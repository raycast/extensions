import { LocalStorage, showToast, Toast } from "@raycast/api";
import { SAVED_COMMANDS_KEY, TRIGGER_FILTERS_KEY, DETAIL_VIEW_KEY } from "./constants";

/**
 * Clears all LocalStorage data related to this extension.
 * This is useful for troubleshooting when there might be corrupted data.
 * @returns A promise that resolves when all data is cleared.
 */
export async function resetAllStorageData(): Promise<void> {
  try {
    // List of all storage keys used by this extension
    const keysToRemove = [
      SAVED_COMMANDS_KEY,
      TRIGGER_FILTERS_KEY,
      DETAIL_VIEW_KEY,
      // Add any other keys used by the extension here
    ];
    
    // Remove each key
    for (const key of keysToRemove) {
      await LocalStorage.removeItem(key);
    }
    
    await showToast({
      style: Toast.Style.Success,
      title: "Storage Reset Complete",
      message: "All saved commands and filters have been cleared."
    });
  } catch (error) {
    console.error("Failed to reset storage data:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Reset Failed",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    });
    throw new Error("Could not reset storage data.");
  }
}

/**
 * Clears only the saved commands from LocalStorage.
 * @returns A promise that resolves when commands are cleared.
 */
export async function resetSavedCommands(): Promise<void> {
  try {
    await LocalStorage.removeItem(SAVED_COMMANDS_KEY);
    await showToast({
      style: Toast.Style.Success,
      title: "Commands Reset",
      message: "All saved webhook commands have been cleared."
    });
  } catch (error) {
    console.error("Failed to reset saved commands:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Reset Failed",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    });
    throw new Error("Could not reset saved commands.");
  }
}

/**
 * Clears only the saved filters from LocalStorage.
 * @returns A promise that resolves when filters are cleared.
 */
export async function resetSavedFilters(): Promise<void> {
  try {
    await LocalStorage.removeItem(TRIGGER_FILTERS_KEY);
    await showToast({
      style: Toast.Style.Success,
      title: "Filters Reset",
      message: "All saved workflow filters have been cleared."
    });
  } catch (error) {
    console.error("Failed to reset saved filters:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Reset Failed",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    });
    throw new Error("Could not reset saved filters.");
  }
}
