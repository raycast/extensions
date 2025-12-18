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

  // Show confirmation dialog for permanent deletions (single or multiple)
  if (isPermanentDelete) {
    const fileList = isMultipleFiles ? downloads.map((d) => d.file).join("\n") : downloads[0].file;
    const title = isMultipleFiles ? `Delete ${downloads.length} Files?` : "Delete File?";
    const message = isMultipleFiles
      ? `Are you sure you want to permanently delete these ${downloads.length} files?\n\n${fileList}`
      : `Are you sure you want to permanently delete:\n${downloads[0].path}?`;

    const shouldDelete = await confirmAlert({
      title,
      message,
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
        });
        deletedCount++;
      } catch (error) {
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
