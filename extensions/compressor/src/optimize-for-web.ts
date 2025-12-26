import { showToast, Toast, getSelectedFinderItems, showHUD } from "@raycast/api";
import { processBatch, generateBatchSummary } from "./utils/batch-processor";
import { ProcessingOptions, IMAGE_PRESETS, VIDEO_PRESETS } from "./utils/types";
import { fileTypeFromFile } from "file-type";

export default async function Command() {
  try {
    // Show initial loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Optimizing for web...",
      message: "Getting selected files",
    });

    // Get selected files from Finder/Explorer
    const selectedFiles = await getSelectedFinderItems();

    if (selectedFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select one or more files to optimize",
      });
      return;
    }

    const filePaths = selectedFiles.map((file) => file.path);

    // Determine preset based on first file type
    const firstFileType = await fileTypeFromFile(filePaths[0]);
    const isVideo = firstFileType?.mime.startsWith("video/");

    // Use Medium preset for images (1280px) or 720p for videos
    const preset = isVideo
      ? VIDEO_PRESETS.find((p) => p.name === "720p")!
      : IMAGE_PRESETS.find((p) => p.name === "Medium")!;

    // Process all files with both resize and compress
    const options: ProcessingOptions = {
      compress: true,
      resize: true,
      resizePreset: preset,
    };

    const result = await processBatch(filePaths, options);

    // Show summary
    const summary = generateBatchSummary(result, "Optimized for web");
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
