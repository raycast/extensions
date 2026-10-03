import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { clearPhotoshopCaches } from "./services/automation";

export default async function Command() {
  const confirmed = await confirmAlert({
    title: "Clear Photoshop Cache",
    message:
      "Purging Photoshop memory will clear the clipboard and undo history for any open documents in Photoshop. Scratch and thumbnail caches will also be removed. Are you sure you want to proceed?",
    primaryAction: {
      title: "Clear Cache",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Purging Photoshop caches...",
  });

  try {
    const result = await clearPhotoshopCaches(true);
    if (result.errors.length > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Cache partially cleared";
      toast.message = `Freed ${result.formattedFreedSpace}, but ${result.errors.length} item(s) failed to delete.`;
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Photoshop cache cleared";
      toast.message = `Freed ${result.formattedFreedSpace}${result.purgedMemory ? " & purged memory" : ""}`;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to clear cache";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
