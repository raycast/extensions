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
    if (res.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Media Cache Cleared";
      toast.message = `Freed ${res.formattedFreedSpace} of disk space across ${res.clearedDirectories.length} cache directories`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to clear media cache";
      toast.message = res.error || "An unknown error occurred while deleting cache files.";
    }
  } catch (error: unknown) {
    await showFailureToast(error, { title: "Failed to purge media cache" });
  }
}
