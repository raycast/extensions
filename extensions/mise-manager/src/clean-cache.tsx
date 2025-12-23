import { showToast, Toast } from "@raycast/api";
import { cleanCache, formatMiseError } from "./tools/mise";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Cleaning cache..." });
  try {
    await cleanCache();
    toast.style = Toast.Style.Success;
    toast.title = "Cache cleaned successfully";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to clean cache";
    toast.message = formatMiseError(error);
  }
}
