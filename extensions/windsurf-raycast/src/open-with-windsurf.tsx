import { showToast, Toast, getSelectedFinderItems, showHUD } from "@raycast/api";
import { openInWindsurf, checkWindsurfInstalled } from "./utils/windsurf";
import path from "path";

export default async function OpenWithWindsurf() {
  try {
    // Check if Windsurf is installed
    const isInstalled = await checkWindsurfInstalled();
    if (!isInstalled) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Windsurf not found",
        message: "Please install Windsurf IDE to use this extension",
      });
      return;
    }

    // Get selected items from Finder
    let selectedItems;
    try {
      selectedItems = await getSelectedFinderItems();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a file or folder in Finder first",
      });
      return;
    }

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a file or folder in Finder first",
      });
      return;
    }

    // Open the first selected item in Windsurf
    const targetPath = selectedItems[0].path;
    await openInWindsurf(targetPath);

    // Show success HUD
    await showHUD(`Opened ${path.basename(targetPath)} in Windsurf`);
  } catch (_error) {
    console.error("Error in OpenWithWindsurf:", _error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Windsurf",
      message: _error instanceof Error ? _error.message : "Unknown error",
    });
  }
}
