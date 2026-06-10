import { showToast, Toast, Alert, confirmAlert } from "@raycast/api";
import { showInFinder } from "@raycast/api";
import path from "path";
import { loadCategories, categoriesToFileTypes } from "./utils/categories";
import { analyzeFolder, organizeFolder } from "./utils/file-organizer";
import { pickFolder } from "./utils/folder-picker";
import { chooseOrganizationMode } from "./utils/organization-mode";

export default async function main() {
  try {
    // Load categories from storage
    const categories = await loadCategories();
    const fileTypes = categoriesToFileTypes(categories);

    // Show folder picker dialog
    const folderPath = await pickFolder("Select a folder to organize:");

    if (!folderPath) {
      await showToast({
        style: Toast.Style.Success,
        title: "Folder selection cancelled",
      });
      return;
    }

    const mode = await chooseOrganizationMode();

    if (!mode) {
      await showToast({
        style: Toast.Style.Success,
        title: "Organization cancelled",
      });
      return;
    }

    // First, analyze files to get count
    const analysisToast = await showToast({
      style: Toast.Style.Animated,
      title: "Scanning folder...",
      message: `Analyzing files in ${path.basename(folderPath)}`,
    });

    const analysisResult = analyzeFolder(folderPath, fileTypes, { mode });
    analysisToast.hide();

    if (!analysisResult.success) {
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Analysis failed",
        message: analysisResult.error || "Unknown error occurred",
      });
      return;
    }

    if (analysisResult.total_files === 0) {
      const skippedProjectCount = analysisResult.skipped_projects?.length || 0;
      await showToast({
        style: Toast.Style.Success,
        title: "Folder already clean",
        message:
          skippedProjectCount > 0
            ? `No files need sorting. Skipped ${skippedProjectCount} ${skippedProjectCount === 1 ? "project" : "projects"}.`
            : "No files need to be sorted!",
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
      message: `Files in "${path.basename(folderPath)}" will be moved into folders:\n\n${categoryList}${
        analysisResult.skipped_projects?.length
          ? `\n\nSkipped ${analysisResult.skipped_projects.length} detected ${
              analysisResult.skipped_projects.length === 1 ? "project" : "projects"
            }.`
          : ""
      }`,
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
      message: `Organizing files in ${path.basename(folderPath)}`,
    });

    const sortResult = organizeFolder(folderPath, fileTypes, { mode });

    if (!sortResult.success) {
      sortingToast.style = Toast.Style.Failure;
      sortingToast.title = "❌ Organization failed";
      sortingToast.message = sortResult.error || "Unknown error occurred";
      return;
    }

    sortingToast.style = Toast.Style.Success;
    sortingToast.title = "✅ Folder organized!";
    sortingToast.message = `Sorted ${sortResult.total_moved || 0} files into ${
      sortResult.categories_created?.length || 0
    } folders`;

    // Offer to open the organized folder
    const openFolder = await confirmAlert({
      title: "Folder organized successfully!",
      message: `${sortResult.total_moved} files have been sorted. Would you like to view the organized folder?`,
      primaryAction: {
        title: "Open Folder",
        style: Alert.ActionStyle.Default,
      },
      dismissAction: {
        title: "Done",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (openFolder) {
      await showInFinder(folderPath);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "❌ Organization failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
