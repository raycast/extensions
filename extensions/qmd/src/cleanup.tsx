import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { runQmdRaw } from "./utils/qmd";

export default async function Command() {
  await closeMainWindow();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Cleaning up...",
    message: "Removing orphaned data",
  });

  const result = await runQmdRaw(["cleanup"]);

  if (result.success) {
    toast.style = Toast.Style.Success;
    toast.title = "Cleanup complete";
    toast.message = "Orphaned data has been removed";
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Cleanup failed";
    toast.message = result.error || "Unknown error";
  }
}
