import { showToast, Toast, getSelectedFinderItems, showHUD } from "@raycast/api";
import { fileTypeFromFile } from "file-type";
import path from "path";
import { compressImage, compressVideo } from "./utils/compression";

export default async function Command() {
  try {
    // Show initial loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Compressing...",
      message: "Getting selected file",
    });

    // Get selected file from Finder/Explorer
    const selectedFiles = await getSelectedFinderItems();

    if (selectedFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a file to compress",
      });
      return;
    }

    const filePath = selectedFiles[0].path;

    // Update toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Analyzing file...",
      message: path.basename(filePath),
    });

    // Detect file type
    const fileType = await fileTypeFromFile(filePath);

    if (!fileType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unsupported file type",
        message: "Could not determine file type",
      });
      return;
    }

    const { mime } = fileType;

    // Determine if it's an image or video
    if (mime.startsWith("image/")) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Compressing image...",
        message: "This may take a moment",
      });

      const result = await compressImage(filePath);

      if (result.success && result.outputPath) {
        const savings =
          result.originalSize && result.compressedSize
            ? ((1 - result.compressedSize / result.originalSize) * 100).toFixed(1)
            : "0";

        await showHUD(`✅ Image compressed! Saved ${savings}% - ${path.basename(result.outputPath)}`);
      } else {
        console.error("Image compression error:", result.error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Compression failed",
          message: result.error?.substring(0, 100) || "Unknown error",
        });
      }
    } else if (mime.startsWith("video/")) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Compressing video...",
        message: "This may take several minutes",
      });

      const result = await compressVideo(filePath);

      if (result.success && result.outputPath) {
        const savings =
          result.originalSize && result.compressedSize
            ? ((1 - result.compressedSize / result.originalSize) * 100).toFixed(1)
            : "0";

        await showHUD(`✅ Video compressed! Saved ${savings}% - ${path.basename(result.outputPath)}`);
      } else {
        console.error("Video compression error:", result.error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Compression failed",
          message: result.error?.substring(0, 100) || "Unknown error",
        });
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unsupported file type",
        message: `Only images and videos are supported (detected: ${mime})`,
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
