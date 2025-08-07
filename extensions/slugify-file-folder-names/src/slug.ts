import { getSelectedFinderItems, showToast, Toast, showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { promises as fs } from "fs";
import path from "path";
import { generateSlugFilename } from "./utils/slugify";

interface RenameResult {
  success: boolean;
  originalPath: string;
  newPath?: string;
  error?: string;
}

/**
 * Checks if a file or directory exists at the given path
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a unique filename if there's a conflict
 */
async function generateUniqueFilename(dirPath: string, baseSlugName: string): Promise<string> {
  let finalName = baseSlugName;
  let counter = 1;

  const extension = path.extname(baseSlugName);
  const nameWithoutExt = path.basename(baseSlugName, extension);

  while (await pathExists(path.join(dirPath, finalName))) {
    finalName = `${nameWithoutExt}-${counter}${extension}`;
    counter++;
  }

  return finalName;
}

/**
 * Renames a single file or directory
 */
async function renameItem(itemPath: string, useGermanTranslation: boolean): Promise<RenameResult> {
  try {
    const dirPath = path.dirname(itemPath);
    const originalName = path.basename(itemPath);

    // Generate slugified name
    const slugifiedName = generateSlugFilename(originalName, true, useGermanTranslation);

    // If the name is already slugified, skip
    if (originalName === slugifiedName) {
      return {
        success: true,
        originalPath: itemPath,
        newPath: itemPath,
      };
    }

    // Generate unique filename if there's a conflict
    const uniqueSlugName = await generateUniqueFilename(dirPath, slugifiedName);
    const newPath = path.join(dirPath, uniqueSlugName);

    // Perform the rename
    await fs.rename(itemPath, newPath);

    return {
      success: true,
      originalPath: itemPath,
      newPath,
    };
  } catch (error) {
    return {
      success: false,
      originalPath: itemPath,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Main command function
 */
export default async function Command() {
  try {
    // Get preferences
    const preferences = getPreferenceValues<Preferences>();

    // Show initial loading toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Getting selected items...",
    });

    // Get selected items from Finder
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No items selected",
        message: "Please select files or folders in Finder and try again.",
      });
      return;
    }

    // Update toast to show processing
    loadingToast.style = Toast.Style.Animated;
    loadingToast.title = `Slugifying ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""}...`;

    // Process each selected item
    const results: RenameResult[] = [];
    for (const item of selectedItems) {
      const result = await renameItem(item.path, preferences.enableGermanTranslation);
      results.push(result);
    }

    // Count successes and failures
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Prepare summary message
    let summaryMessage = `${successCount} item${successCount !== 1 ? "s" : ""} renamed successfully`;
    if (failureCount > 0) {
      summaryMessage += `, ${failureCount} failed`;
    }

    // Show final toast
    if (failureCount === 0) {
      await showHUD(summaryMessage);
    } else {
      await showToast({
        style: failureCount === results.length ? Toast.Style.Failure : Toast.Style.Success,
        title: summaryMessage,
        message: failureCount > 0 ? "Check Activity Monitor for details" : undefined,
      });
    }

    // Copy rename summary to clipboard if there were any renames
    if (successCount > 0) {
      const renameLog = results
        .filter((r) => r.success && r.originalPath !== r.newPath)
        .map((r) => {
          const originalName = path.basename(r.originalPath);
          const newName = path.basename(r.newPath ?? r.originalPath);
          return `${originalName} → ${newName}`;
        })
        .join("\n");

      if (renameLog) {
        await Clipboard.copy(renameLog);
      }
    }

    // Log errors for failed items
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      console.error("Failed to rename items:", failures);
    }
  } catch (error) {
    await showFailureToast(error, { title: "Cannot slugify files" });
    console.error("Slugify command error:", error);
  }
}
