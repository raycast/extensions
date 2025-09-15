import { exec } from "child_process";
import { showToast, Toast, Alert, confirmAlert, environment } from "@raycast/api";
import path from "path";
import os from "os";
import { loadCategories, categoriesToFileTypes } from "./utils/categories";
import { checkPython3Available } from "./utils/python-check";

export default async function main() {
  try {
    // Check if Python 3 is available
    const pythonAvailable = await checkPython3Available();
    if (!pythonAvailable) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Python 3 not found",
        message: "Please install Python 3 to use this extension",
      });
      return;
    }

    // Load categories from storage
    const categories = await loadCategories();
    const fileTypes = categoriesToFileTypes(categories);

    const scriptPath = path.join(environment.assetsPath, "scripts/file_organizer.py");
    const downloadsPath = path.join(os.homedir(), "Downloads");
    // First, analyze files to get count
    const analysisToast = await showToast({
      style: Toast.Style.Animated,
      title: "Scanning Downloads folder...",
    });

    const analysisResult = await runCleanupScript(scriptPath, downloadsPath, fileTypes, "analyze");
    analysisToast.hide();

    if (analysisResult.total_files === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Downloads already clean",
        message: "No files need to be sorted!",
      });
      return;
    }

    // Show confirmation dialog
    const categoryList = Object.entries(analysisResult.categories || {})
      .map(([category, files]) => {
        const fileCount = Array.isArray(files) ? files.length : files;
        const folderName = "'" + category + "'";
        return `${fileCount} ${fileCount === 1 ? "file" : "files"} to the ${folderName} folder`;
      })
      .join("\n");

    const confirmed = await confirmAlert({
      title: `Sort ${analysisResult.total_files} files?`,
      message: `Files will be moved into folders:\n\n${categoryList}`,
      primaryAction: {
        title: "Sort Files",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) {
      await showToast({
        style: Toast.Style.Success,
        title: "Sorting cancelled",
      });
      return;
    }

    // Actually organize the files
    const sortingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Sorting files...",
    });

    const sortResult = await runCleanupScript(scriptPath, downloadsPath, fileTypes);

    sortingToast.style = Toast.Style.Success;
    sortingToast.title = "✅ Downloads cleaned up!";
    sortingToast.message = `Sorted ${sortResult.total_moved || 0} files into ${
      sortResult.categories_created?.length || 0
    } folders`;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "❌ Cleanup failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

interface ScriptResult {
  total_files: number;
  organized_files: number;
  categories?: Record<string, number>;
  total_moved?: number;
  categories_created?: string[];
  [key: string]: unknown;
}

function runCleanupScript(
  scriptPath: string,
  folderPath: string,
  fileTypes: Record<string, string[]>,
  command?: string,
): Promise<ScriptResult> {
  return new Promise((resolve, reject) => {
    const categoriesJson = JSON.stringify(fileTypes);
    // Properly escape single quotes in JSON to prevent shell injection
    const escapedJson = categoriesJson.replace(/'/g, "'\"'\"'");
    const args = command ? ` "${folderPath}" '${escapedJson}' ${command}` : ` "${folderPath}" '${escapedJson}'`;
    exec(`python3 "${scriptPath}"${args}`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch {
        reject(new Error(`Failed to parse script output: ${stdout}`));
      }
    });
  });
}
