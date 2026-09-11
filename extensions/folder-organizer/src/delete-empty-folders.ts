import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import path from "path";
import { analyzeEmptyFolders, deleteEmptyFolders } from "./utils/empty-folder-cleaner";
import { pickFolder } from "./utils/folder-picker";

export default async function main() {
  try {
    const folderPath = await pickFolder("Select a folder to remove empty folders from:");

    if (!folderPath) {
      await showToast({
        style: Toast.Style.Success,
        title: "Folder selection cancelled",
      });
      return;
    }

    const analysisToast = await showToast({
      style: Toast.Style.Animated,
      title: "Scanning for empty folders...",
      message: `Checking ${path.basename(folderPath)}`,
    });

    const analysisResult = analyzeEmptyFolders(folderPath);
    analysisToast.hide();

    if (!analysisResult.success) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Scan failed",
        message: analysisResult.error || "Unknown error occurred",
      });
      return;
    }

    if (analysisResult.total_folders === 0) {
      const skippedCount = analysisResult.skipped_folders.length;

      if (skippedCount > 0) {
        await confirmAlert({
          title: "Some folders could not be scanned",
          message: `${formatSkippedFolders(analysisResult.skipped_folders, folderPath)}\n\nCheck Raycast access under System Settings → Privacy & Security → Files and Folders.`,
          primaryAction: {
            title: "OK",
            style: Alert.ActionStyle.Default,
          },
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "No empty folders found",
      });
      return;
    }

    const previewLimit = 8;
    const folderPreview = analysisResult.folders
      .slice(0, previewLimit)
      .map((folder) => `• ${folder}`)
      .join("\n");
    const remainingCount = analysisResult.total_folders - previewLimit;
    const skippedPreview = formatSkippedFolders(analysisResult.skipped_folders, folderPath);
    const confirmed = await confirmAlert({
      title: `Delete ${analysisResult.total_folders} empty ${
        analysisResult.total_folders === 1 ? "folder" : "folders"
      }?`,
      message: `${folderPreview}${remainingCount > 0 ? `\n• and ${remainingCount} more` : ""}${skippedPreview}`,
      primaryAction: {
        title: "Delete Empty Folders",
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
        title: "Deletion cancelled",
      });
      return;
    }

    const deletionToast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting empty folders...",
    });
    const deletionResult = deleteEmptyFolders(folderPath, analysisResult.folders);

    if (!deletionResult.success) {
      deletionToast.style = Toast.Style.Failure;
      deletionToast.title = "Deletion failed";
      deletionToast.message = deletionResult.error || "Unknown error occurred";
      return;
    }

    const skippedFolders = [...analysisResult.skipped_folders, ...deletionResult.skipped_folders];
    deletionToast.style = skippedFolders.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
    deletionToast.title =
      skippedFolders.length > 0 ? "Cleanup completed with skipped folders" : "Empty folders deleted";
    deletionToast.message = `Deleted ${deletionResult.total_folders} ${
      deletionResult.total_folders === 1 ? "folder" : "folders"
    }${skippedFolders.length > 0 ? `. ${formatSkippedFoldersForToast(skippedFolders)}` : ""}`;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Deletion failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

function formatSkippedFolders(skippedFolders: { path: string; reason: string }[], rootPath: string): string {
  if (skippedFolders.length === 0) {
    return "";
  }

  const previewLimit = 5;
  const preview = skippedFolders
    .slice(0, previewLimit)
    .map((folder) => `• ${folder.path === "." ? rootPath : folder.path}: ${folder.reason}`)
    .join("\n");
  const remainingCount = skippedFolders.length - previewLimit;

  return `\n\nSkipped unreadable folders:\n${preview}${remainingCount > 0 ? `\n• and ${remainingCount} more` : ""}`;
}

function formatSkippedFoldersForToast(skippedFolders: { path: string; reason: string }[]): string {
  const previewLimit = 2;
  const preview = skippedFolders
    .slice(0, previewLimit)
    .map((folder) => `${folder.path}: ${folder.reason}`)
    .join("; ");
  const remainingCount = skippedFolders.length - previewLimit;

  return `Skipped ${preview}${remainingCount > 0 ? `; and ${remainingCount} more` : ""}. Check Raycast folder permissions.`;
}
