import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { fetchPrompts } from "./api";
import { setCachedPrompts, getLastSyncTime } from "./storage";

export default async function SyncPrompts() {
  try {
    // Show sync start notification
    await showToast({
      style: Toast.Style.Animated,
      title: "Syncing...",
      message: "Fetching latest data from server",
    });

    // Fetch latest data from API
    const prompts = await fetchPrompts();

    // Save to local cache
    await setCachedPrompts(prompts);

    // Get sync time
    const lastSync = await getLastSyncTime();
    const syncTime = lastSync ? lastSync.toLocaleString() : "Just now";

    // Show success notification
    await showToast({
      style: Toast.Style.Success,
      title: "Sync Complete",
      message: `Synced ${prompts.length} prompts (${syncTime})`,
    });

    // Close Raycast window
    await closeMainWindow();
  } catch (error) {
    console.error("Sync failed:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Sync Failed",
      message:
        error instanceof Error ? error.message : "Please check network connection and API Key",
    });
  }
}
