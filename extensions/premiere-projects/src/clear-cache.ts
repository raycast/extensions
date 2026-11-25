import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { calculateMediaCacheSize, clearPremiereMediaCaches } from "./services/cache";

export default async function ClearCacheCommand() {
  try {
    const { formattedSize, directories } = await calculateMediaCacheSize();

    const dirList = directories.length > 0 ? directories.join("\n") : "No media cache folders located.";

    const confirmed = await confirmAlert({
      title: "Purge Premiere Pro Media Cache?",
      message: `This will clean temporary cache and peak waveform files (${formattedSize}) from:\n${dirList}\n\nPremiere Pro will rebuild these files automatically when projects are opened.`,
      primaryAction: {
        title: "Clear Media Cache",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clearing Premiere Pro Media Cache...",
    });

    const res = await clearPremiereMediaCaches();
    if (res.success && (!res.failedCount || res.failedCount === 0)) {
      toast.style = Toast.Style.Success;
      toast.title = "Media Cache Cleared";
      toast.message = `Freed ${res.formattedFreedSpace} of disk space across ${res.clearedDirectories.length} cache directories`;
    } else if (res.totalFreed > 0 && res.failedCount && res.failedCount > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Partially Cleared Media Cache";
      toast.message = `Freed ${res.formattedFreedSpace}, but ${res.failedCount} file(s) could not be deleted (files may be in use by Premiere Pro)`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Clear Media Cache";
      toast.message =
        res.error ||
        (res.failedCount
          ? `${res.failedCount} file(s) could not be deleted (files may be in use by Premiere Pro)`
          : "No files were deleted.");
    }
  } catch (error: unknown) {
    await showFailureToast(error, { title: "Failed to purge media cache" });
  }
}
