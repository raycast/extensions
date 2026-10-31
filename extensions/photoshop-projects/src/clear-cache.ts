import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
    if (result.memoryPurgeError) {
      toast.message = `Freed ${result.formattedFreedSpace} on disk (memory purge failed: ${result.memoryPurgeError})`;
    } else {
      toast.message = `Freed ${result.formattedFreedSpace}${result.purgedMemory ? " & purged memory" : ""}`;
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed to clear cache" });
  }
}
