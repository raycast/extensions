import { openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { getPreferences } from "./lib/preferences";
import { syncCache } from "./lib/sync";

export default async function Command() {
  const preferences = getPreferences();
  if (!preferences.apiKey) {
    await showToast({ style: Toast.Style.Failure, title: "Missing Workflowy API Key", message: "Open preferences to add it." });
    await openExtensionPreferences();
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Syncing Workflowy…" });

  try {
    const result = await syncCache((event) => {
      if (event.type === "progress" && event.message) {
        toast.message = event.message;
      }
    });

    toast.style = Toast.Style.Success;
    toast.title = "Workflowy synced";
    toast.message = `${result.nodeCount} items`;
    await showHUD(`Synced ${result.nodeCount} items`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Sync failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
