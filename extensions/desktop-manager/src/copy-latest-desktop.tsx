import { showHUD, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getLatestDesktopFile } from "./utils";

export default async function Command() {
  try {
    const latestFile = getLatestDesktopFile();

    if (!latestFile) {
      await showHUD("No files found on desktop");
      return;
    }

    await Clipboard.copy({ file: latestFile.path });
    await showHUD(`Copied: ${latestFile.file}`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to copy latest desktop file" });
  }
}
