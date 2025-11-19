import { exec } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import { closeMainWindow, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";

const execAsync = promisify(exec);

export default async function Command() {
  try {
    await closeMainWindow();

    // Get selected files from Finder
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showHUD("No files selected. Please select HEIC files in Finder first.");
      return;
    }

    // Filter only HEIC files
    const heicFiles = selectedItems.filter((item) => {
      const ext = path.extname(item.path).toLowerCase();
      return ext === ".heic" || ext === ".heif";
    });

    if (heicFiles.length === 0) {
      await showHUD("No HEIC files found in selection. Please select HEIC files.");
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: `Converting ${heicFiles.length} file(s)...`,
    });

    let successCount = 0;
    let errorCount = 0;

    // Convert each HEIC file using sips
    for (const file of heicFiles) {
      try {
        const inputPath = file.path;
        const dir = path.dirname(inputPath);
        const basename = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(dir, `${basename}.jpg`);

        // Use sips to convert HEIC to JPEG
        await execAsync(
          `sips -s format jpeg -s formatOptions high -s dpiWidth 72 -s dpiHeight 72 -m '/System/Library/ColorSync/Profiles/sRGB Profile.icc' "${inputPath}" --out "${outputPath}"`,
        );
        successCount++;
      } catch (error) {
        console.error(`Error converting ${file.path}:`, error);
        errorCount++;
      }
    }

    // Show completion message
    if (errorCount === 0) {
      await showHUD(`Successfully converted ${successCount} file(s) to JPEG`);
    } else if (successCount === 0) {
      await showHUD(`Failed to convert ${errorCount} file(s)`);
    } else {
      await showHUD(`Converted ${successCount} file(s), ${errorCount} failed`);
    }
  } catch (error) {
    console.error(error);
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
