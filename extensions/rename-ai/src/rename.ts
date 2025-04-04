import {
  showHUD,
  showToast,
  Toast,
  showInFinder,
  closeMainWindow,
  getSelectedFinderItems,
  FileSystemItem,
} from "@raycast/api";
import path from "path";
import { analyzeImageAndSuggestName } from "./ai-service";
import { isImageFile, generateNewFilePath, renameFile, setFileMetadata } from "./file-utils";
import { validateConfig } from "./config";

// Main command
export default async function command() {
  try {
    // Validate API key
    validateConfig();

    // Get selected files from Finder
    const selectedItems = await getSelectedFinderItems();

    // Filter only image files
    const imageFiles = selectedItems.filter((item: FileSystemItem) => isImageFile(item.path));

    if (imageFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image files selected",
        message: "Please select at least one image file in Finder",
      });
      return;
    }

    // Show initial HUD
    await showHUD("Analyzing and renaming images...");

    // Process each image
    const results = [];
    let successCount = 0;

    for (const file of imageFiles) {
      try {
        // Analyze the image using AI to get both filename and text content
        const { filename, textContent } = await analyzeImageAndSuggestName(file.path);

        // Generate the new file path
        const newFilePath = generateNewFilePath(file.path, filename);

        // Rename the file
        await renameFile(file.path, newFilePath);

        // Add the extracted text as metadata to make it searchable in Raycast
        await setFileMetadata(newFilePath, textContent);

        // Add to results
        results.push({
          originalPath: file.path,
          newPath: newFilePath,
          success: true,
          name: path.basename(newFilePath),
          textContent,
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to process ${file.path}:`, error);
        results.push({
          originalPath: file.path,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Show results
    if (successCount > 0) {
      if (successCount === imageFiles.length) {
        await showToast({
          style: Toast.Style.Success,
          title: `Renamed ${successCount} image${successCount > 1 ? "s" : ""}`,
          message: "All files were successfully renamed and text content extracted",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: `Renamed ${successCount} of ${imageFiles.length} images`,
          message: "Some files couldn't be processed completely",
        });
      }

      // Show in Finder
      if (results.length > 0 && results[0].success && results[0].newPath) {
        await showInFinder(results[0].newPath);
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to process images",
        message: "None of the selected images could be processed",
      });
    }

    // Close the main window
    await closeMainWindow();
  } catch (error) {
    console.error("Error in command:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
