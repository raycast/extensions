import { Alert, confirmAlert } from "@raycast/api";
import { clearRecentUploads } from "./storage";

export async function confirmClearRecentUploads(): Promise<boolean> {
  const confirmed = await confirmAlert({
    title: "Clear All Recent Uploads?",
    message:
      "This removes all saved links from your local history. Uploaded files remain on Litterbox until they expire.",
    primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
    dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
  });
  if (!confirmed) return false;
  await clearRecentUploads();
  return true;
}
