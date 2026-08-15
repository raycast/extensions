import { showHUD, showInFinder } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getLatestDesktopFile } from "./utils";

export default async function Command() {
  try {
    const latestFile = getLatestDesktopFile();

    if (!latestFile) {
      await showHUD("No files found on desktop");
      return;
    }

    await showInFinder(latestFile.path);
    await showHUD(`Showed in Finder: ${latestFile.file}`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to show latest desktop file in Finder" });
  }
}
