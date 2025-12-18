import { getLatestDownloads, hasAccessToDownloadsFolder, deleteFileOrFolder } from "./utils";
import { popToRoot, showHUD, LaunchProps, confirmAlert, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function main(props: LaunchProps<{ arguments: Arguments.DeleteLatestDownload }>) {
  if (!hasAccessToDownloadsFolder()) {
    await showHUD("No permission to access the downloads folder");
    return;
  }

  const quantity = props.arguments.quantity ? parseInt(props.arguments.quantity, 10) || 1 : 1;
  const downloads = getLatestDownloads(quantity);

  if (downloads.length === 0) {
    await showHUD("No downloads found");
    return;
  }

  const preferences = getPreferenceValues();
  const deletionBehavior = preferences.deletionBehavior as string;
  const isPermanentDelete = deletionBehavior === "permaDel";
  const isMultipleFiles = downloads.length > 1;

  // Show single confirmation dialog for multiple permanent deletions
  if (isPermanentDelete && isMultipleFiles) {
    const fileList = downloads.map((d) => d.file).join("\n");
    const shouldDelete = await confirmAlert({
      title: `Delete ${downloads.length} Files?`,
      message: `Are you sure you want to permanently delete these ${downloads.length} files?\n\n${fileList}`,
      primaryAction: {
        title: "Delete",
      },
    });

    if (!shouldDelete) {
      await showHUD("Deletion cancelled");
      await popToRoot();
      return;
    }
  }

  let deletedCount = 0;
  const errors: Error[] = [];

  try {
    for (const download of downloads) {
      try {
        await deleteFileOrFolder(download.path, {
          skipToasts: isMultipleFiles,
          skipConfirmation: isPermanentDelete && isMultipleFiles,
        });
        deletedCount++;
      } catch (error) {
        if (error instanceof Error && error.message === "Deletion cancelled by user") {
          // User cancelled during individual file deletion (shouldn't happen with upfront confirmation, but handle it)
          break;
        }
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Only show success message if files were actually deleted
    if (deletedCount > 0) {
      const message = deletedCount === 1 ? "download" : `${deletedCount} downloads`;
      await showHUD(`Deleted latest ${message}`);
    } else if (errors.length > 0) {
      await showFailureToast(new Error("Failed to delete files"), { title: "Deletion Failed" });
    }
  } catch (error) {
    await showFailureToast(error, { title: "Deletion Failed" });
  }
  await popToRoot();
}
