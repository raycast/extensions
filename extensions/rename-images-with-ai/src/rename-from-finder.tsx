import { showToast, Toast, getSelectedFinderItems, closeMainWindow, popToRoot } from "@raycast/api";
import path from "path";
import { renameScreenshots } from "./utils/screenshot-renamer";

export default async function RenameFromFinder() {
  try {
    // Close the main window immediately so user can continue working
    await closeMainWindow();

    // Get selected files
    const items = await getSelectedFinderItems();

    // Filter for image files
    const imageFiles = items.filter((item) => {
      const ext = path.extname(item.path).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);
    });

    if (imageFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Images Selected",
        message: "Please select image files in Finder first",
      });
      return;
    }

    // Process the files without showing intermediate progress
    const results = await renameScreenshots(imageFiles.map((item) => item.path));

    // Count successes and failures
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    // Just show a simple toast notification with the result
    await showToast({
      style: successCount > 0 ? Toast.Style.Success : Toast.Style.Failure,
      title: `Renamed ${successCount} of ${results.length} files`,
      message: failureCount > 0 ? "Some files couldn't be renamed" : "",
    });
  } catch (error) {
    console.error("Error in rename-from-finder:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error Renaming Files",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    // Ensure Raycast is closed/returned to root
    await popToRoot();
  }
}
