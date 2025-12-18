import { getLatestDownloads, hasAccessToDownloadsFolder, deleteFileOrFolder } from "./utils";
import { popToRoot, showHUD, LaunchProps } from "@raycast/api";
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

  try {
    for (const download of downloads) {
      await deleteFileOrFolder(download.path);
    }
    const message = downloads.length === 1 ? "download" : `${downloads.length} downloads`;
    await showHUD(`Deleted latest ${message}`);
  } catch (error) {
    await showFailureToast(error, { title: "Deletion Failed" });
  }
  await popToRoot();
}
