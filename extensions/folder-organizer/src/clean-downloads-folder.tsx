import { closeMainWindow, showToast, Toast, Alert, confirmAlert } from "@raycast/api";
import path from "path";
import os from "os";
import { loadCategories, categoriesToFileTypes } from "./utils/categories";
import { analyzeFolder, OrganizationMode, organizeFolder } from "./utils/file-organizer";
import { OrganizationModePicker } from "./utils/organization-mode";
import { formatSkippedSummary } from "./utils/organization-summary";

export default function Command() {
  return <OrganizationModePicker onSelect={organizeDownloads} />;
}

async function organizeDownloads(mode: OrganizationMode) {
  try {
    await closeMainWindow();

    // Load categories from storage
    const categories = await loadCategories();
    const fileTypes = categoriesToFileTypes(categories);

    const downloadsPath = path.join(os.homedir(), "Downloads");
    // First, analyze files to get count
    const analysisToast = await showToast({
      style: Toast.Style.Animated,
      title: "Scanning Downloads folder...",
    });

    const analysisResult = analyzeFolder(downloadsPath, fileTypes, { mode });
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
        title: "Downloads already clean",
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
      message: `Files will be moved into folders:\n\n${categoryList}${formatSkippedSummary(
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
    });

    const sortResult = organizeFolder(downloadsPath, fileTypes, { mode });

    if (!sortResult.success) {
      sortingToast.style = Toast.Style.Failure;
      sortingToast.title = "❌ Cleanup failed";
      sortingToast.message = sortResult.error || "Unknown error occurred";
      return;
    }

    sortingToast.style = Toast.Style.Success;
    sortingToast.title = "✅ Downloads cleaned up!";
    sortingToast.message = `Sorted ${sortResult.total_moved || 0} files into ${
      sortResult.categories_created?.length || 0
    } folders${formatSkippedSummary(
      sortResult.skipped_projects?.length || 0,
      sortResult.skipped_folders?.length || 0,
      ". ",
    )}`;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "❌ Cleanup failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
