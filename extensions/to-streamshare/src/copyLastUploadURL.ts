import { showToast, Toast, Clipboard } from "@raycast/api";
import { getUploadHistory } from "./shared/storage";

export default async function Command() {
  try {
    const history = await getUploadHistory();

    if (history.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No uploads found",
      });
      return;
    }

    const lastUpload = history[0];
    await Clipboard.copy(lastUpload.downloadUrl);

    await showToast({
      style: Toast.Style.Success,
      title: "Copied last upload URL",
      message: lastUpload.sourceFileName,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy URL",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
