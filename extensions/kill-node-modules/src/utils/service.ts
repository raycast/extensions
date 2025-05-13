import { showToast, Toast } from "@raycast/api";
import fs from "fs/promises";
import mainFs from "fs";
import path from "path";
import fg, { Entry } from "fast-glob";
import { tryCatch } from "./try-catch";

export interface NodeModulesItem {
  id: string;
  title: string;
  lastModified: Date;
  size: number;
}

async function calculateDirectorySize(directoryPath: string): Promise<number> {
  let totalSize = 0;
  let entries;
  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (e) {
    // Log error if directory cannot be read, e.g. permission denied
    console.warn(`NodeModuleService: Could not read directory ${directoryPath} for size calculation:`, e);
    return 0; // Return 0 as size cannot be determined for this path
  }

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    // Skip symbolic links to avoid potential issues like double counting or infinite loops
    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isFile()) {
      try {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      } catch (e) {
        // Log error if file cannot be stated, but continue with other files
        console.warn(`NodeModuleService: Could not stat file ${fullPath} during size calculation:`, e);
      }
    } else if (entry.isDirectory()) {
      totalSize += await calculateDirectorySize(fullPath); // Recursive call for subdirectories
    }
  }
  return totalSize;
}

function validateRootFolder(selectedRoot: string): boolean {
  if (!selectedRoot) return false;
  try {
    return mainFs.existsSync(selectedRoot) && mainFs.statSync(selectedRoot).isDirectory();
  } catch (e: unknown) {
    console.error("Error validating root folder " + selectedRoot + ":", e);
    return false;
  }
}

function isDangerous(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const hiddenFilePattern = new RegExp("(^|\\/)\\.[^\\/.]");
  const macAppsPattern = new RegExp("/Applications/[^/]+\\.app\\/");
  return hiddenFilePattern.test(normalizedPath) || macAppsPattern.test(normalizedPath);
}

export class NodeModuleService {
  static async getModules(rootFolder: string, scanDepth: number): Promise<NodeModulesItem[]> {
    if (!validateRootFolder(rootFolder)) {
      showToast(Toast.Style.Failure, "Invalid Root Folder", "Please select a valid directory to scan.");
      return [];
    }

    console.debug('NodeModuleService: Starting scan in "' + rootFolder + '" with depth ' + scanDepth);

    const globAsyncTask = async () => {
      const globPattern = "**/node_modules";
      return await fg(globPattern, {
        cwd: rootFolder,
        deep: scanDepth,
        onlyDirectories: true,
        absolute: true,
        stats: true,
        ignore: ["**/node_modules/*"],
        dot: true,
        followSymbolicLinks: false,
        unique: true,
        objectMode: true,
      });
    };

    const { data: modulePaths, error: globError } = await tryCatch<Entry[], Error>(globAsyncTask());

    if (globError) {
      console.error("NodeModuleService: Error during fast-glob operation:", globError);
      throw new Error("Scan for node_modules failed during glob operation: " + globError.message);
    }

    if (!modulePaths) {
      console.warn("NodeModuleService: modulePaths is null or undefined after successful glob operation");
      return [];
    }

    const validPaths: Entry[] = modulePaths.filter((entry) => !isDangerous(entry.path));
    console.debug("NodeModuleService: fast-glob found " + validPaths.length + " non-dangerous node_modules paths.");

    const modulePromises = validPaths.map(async (entry) => {
      const stats = entry.stats;
      if (!stats) {
        console.warn("NodeModuleService: Entry missing stats:", entry.path);
        return null;
      }

      const { data: calculatedSize, error: sizeError } = await tryCatch(calculateDirectorySize(entry.path));

      if (sizeError) {
        console.error(`NodeModuleService: Failed to calculate size for ${entry.path}:`, sizeError);
        // Use 0 for size if calculation failed
        return {
          id: entry.path,
          title: entry.path,
          lastModified: stats.mtime,
          size: 0,
        };
      }

      return {
        id: entry.path,
        title: entry.path,
        lastModified: stats.mtime,
        size: calculatedSize ?? 0,
      };
    });

    const processedItemsResults = await Promise.all(modulePromises);
    const successfullyProcessedItems: NodeModulesItem[] = processedItemsResults.filter(
      (item): item is NodeModulesItem => item !== null,
    );

    successfullyProcessedItems.sort((a, b) => b.size - a.size);
    console.debug("NodeModuleService: Found " + successfullyProcessedItems.length + " modules.");
    return successfullyProcessedItems;
  }

  static async deleteModules(
    modulesToDelete: NodeModulesItem[],
    currentCachedModules: NodeModulesItem[],
  ): Promise<NodeModulesItem[]> {
    let successCount = 0;
    let failureCount = 0;
    const remainingModules = [...currentCachedModules];

    for (const moduleItem of modulesToDelete) {
      const deletePromise = fs.rm(moduleItem.id, { recursive: true, force: true });
      const { error: deleteError } = await tryCatch(deletePromise);

      if (deleteError) {
        failureCount++;
        console.error("NodeModuleService: Failed to delete " + moduleItem.id + ":", deleteError);
        let message = "An unknown error occurred during deletion";
        if (deleteError instanceof Error) {
          message = deleteError.message;
        }
        showToast(Toast.Style.Failure, "Failed to delete " + path.basename(moduleItem.id), message);
      } else {
        successCount++;
        console.debug("NodeModuleService: Deleted " + moduleItem.id);
        const index = remainingModules.findIndex((m) => m.id === moduleItem.id);
        if (index > -1) {
          remainingModules.splice(index, 1);
        }
      }
    }

    if (modulesToDelete.length > 0 && successCount > 0) {
      showToast(
        Toast.Style.Success,
        "Deleted " + successCount + " node_modules folder" + (successCount > 1 ? "s" : ""),
        failureCount > 0 ? failureCount + " failed." : "All selected modules deleted.",
      );
    }

    if (failureCount > 0 && failureCount === modulesToDelete.length) {
      throw new Error("Failed to delete all " + failureCount + " selected node_modules folder(s).");
    } else if (failureCount > 0) {
      throw new Error(
        "Failed to delete " + failureCount + " out of " + modulesToDelete.length + " selected node_modules folder(s).",
      );
    }

    return remainingModules;
  }
}
