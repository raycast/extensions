import { Toast, open, showToast } from "@raycast/api";
import { formatMiseError, getCachePath } from "./tools/mise";

export default async function OpenCacheDirectoryCommand() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening cache directory" });
  try {
    const cachePath = await getCachePath();
    await open(cachePath);
    toast.style = Toast.Style.Success;
    toast.title = "Cache directory opened";
    toast.message = cachePath;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to open cache directory";
    toast.message = formatMiseError(error);
  }
}
