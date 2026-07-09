import { closeMainWindow, showToast, Toast, Alert, confirmAlert } from "@raycast/api";
import { showInFinder } from "@raycast/api";
import path from "path";
import { loadCategories, categoriesToFileTypes } from "./utils/categories";
import { analyzeFolder, OrganizationMode, organizeFolder } from "./utils/file-organizer";
import { pickFolder } from "./utils/folder-picker";
import { OrganizationModePicker } from "./utils/organization-mode";
import { formatSkippedSummary } from "./utils/organization-summary";

export default function Command() {
  return <OrganizationModePicker onSelect={organizeCustomFolder} />;
}

async function organizeCustomFolder(mode: OrganizationMode) {
  try {
    await closeMainWindow();

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
      const skippedFolderCount = analysisResult.skipped_folders?.length || 0;
      await showToast({
        style: skippedFolderCount > 0 ? Toast.Style.Failure : Toast.Style.Success,
        title: "Folder already clean",
        message: formatSkippedSummary(skippedProjectCount, skippedFolderCount) || "No files need to be sorted!",
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
      message: `Files in "${path.basename(folderPath)}" will be moved into folders:\n\n${categoryList}${formatSkippedSummary(
        analysisResult.skipped_projects?.length || 0,
        analysisResult.skipped_folders?.length || 0,
        "\n\n",
      )}`,
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
    } folders${formatSkippedSummary(
      sortResult.skipped_projects?.length || 0,
      sortResult.skipped_folders?.length || 0,
      ". ",
    )}`;

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
