import { showToast, Toast, getSelectedFinderItems, showHUD } from "@raycast/api";
import { processBatch, generateBatchSummary } from "./utils/batch-processor";
import { ProcessingOptions } from "./utils/types";

export default async function Command() {
  try {
    // Show initial loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Starting compression...",
      message: "Getting selected files",
    });

    // Get selected files from Finder/Explorer
    const selectedFiles = await getSelectedFinderItems();

    if (selectedFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select one or more files to compress",
      });
      return;
    }

    const filePaths = selectedFiles.map((file) => file.path);

    // Process all files with compression only
    const options: ProcessingOptions = {
      compress: true,
      resize: false,
    };

    const result = await processBatch(filePaths, options);

    // Show summary
    const summary = generateBatchSummary(result, "Compressed");
    await showHUD(summary);

    // If there were errors, show them in a toast
    if (result.errors.length > 0 && result.errors.length < result.totalFiles) {
      const errorList = result.errors.map((e) => `${e.file}: ${e.error}`).join("\n");
      await showToast({
        style: Toast.Style.Failure,
        title: "Some files failed",
        message: errorList.substring(0, 200),
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
