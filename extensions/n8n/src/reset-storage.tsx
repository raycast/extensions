import { showToast, Toast } from "@raycast/api";
import { resetAllStorageData } from "./utils/reset-utils";

/**
 * This command resets all storage data for the extension.
 * It's useful for troubleshooting when there might be corrupted data.
 */
export default async function ResetStorage() {
  try {
    await resetAllStorageData();
    // The toast is already shown by resetAllStorageData
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Reset Storage",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
