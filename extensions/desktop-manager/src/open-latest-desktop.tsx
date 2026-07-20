import { showHUD, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getLatestDesktopFile } from "./utils";

export default async function Command() {
  try {
    const latestFile = getLatestDesktopFile();

    if (!latestFile) {
      await showHUD("No files found on desktop");
      return;
    }

    await open(latestFile.path);
    await showHUD(`Opened: ${latestFile.file}`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open latest desktop file" });
  }
}
