import { showToast, Toast } from "@raycast/api";
import { clearPhotoshopCaches } from "./services/automation";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Purging Photoshop caches...",
  });

  try {
    const result = await clearPhotoshopCaches();
    toast.style = Toast.Style.Success;
    toast.title = "Photoshop cache cleared";
    toast.message = `Freed ${result.formattedFreedSpace}${result.purgedMemory ? " & purged memory" : ""}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to clear cache";
    toast.message = String(error);
  }
}
