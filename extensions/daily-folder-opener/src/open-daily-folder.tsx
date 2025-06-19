import { showToast, Toast, open, getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { existsSync } from "fs";
import * as path from "path"; // ← Change this line

interface Preferences {
  basePath: string;
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Replace ~ with actual home directory
    const expandedBasePath = preferences.basePath.replace(/^~/, homedir());

    const folderPath = path.join(
      expandedBasePath,
      year.toString(),
      month.toString(),
      day.toString(),
    );

    if (existsSync(folderPath)) {
      await open(folderPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Opened Daily Folder",
        message: folderPath,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Folder doesn't exist",
        message: folderPath,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
