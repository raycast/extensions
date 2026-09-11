import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getLatestDesktopFile, deleteFileOrFolder } from "./utils";

export default async function Command() {
  try {
    const latestFile = getLatestDesktopFile();

    if (!latestFile) {
      await showHUD("No files found on desktop");
      return;
    }

    const deleted = await deleteFileOrFolder(latestFile.path);
    if (deleted) {
      await showHUD(`Deleted: ${latestFile.file}`);
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed to delete latest desktop file" });
  }
}
