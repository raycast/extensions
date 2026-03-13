import { readdir, stat, rm } from "fs/promises";
import { join, resolve } from "path";
import { homedir } from "os";
import { showToast, Toast, showHUD, getPreferenceValues } from "@raycast/api";

interface Preferences {
  daysToKeep: string;
  screenshotFolder: string;
}

export default async function main() {
  const { daysToKeep, screenshotFolder } = getPreferenceValues<Preferences>();
  const numberOfDays = parseInt(daysToKeep, 10);
  const folder = resolve(screenshotFolder.replace("~", homedir));

  try {
    const files = await readdir(folder);

    const screenshots = files
      .filter((file) => file.endsWith(".png") || file.endsWith(".mov"))
      .map((file) => join(folder, file));

    const today = new Date();
    const priorDate = new Date(new Date().setDate(today.getDate() - numberOfDays));

    await showToast({
      style: Toast.Style.Animated,
      title: `🗑 Cleaning ${numberOfDays} days worth of screenshots`,
    });

    let cleanedCount = 0;

    for (const screenshot of screenshots) {
      const stats = await stat(screenshot);

      if (stats.birthtimeMs <= priorDate.getTime()) {
        await rm(screenshot);
        cleanedCount = cleanedCount + 1;
      }
    }

    await showHUD(`✅ Cleaned ${cleanedCount} screenshots`);
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      switch (error.code) {
        case "EPERM":
          return showToast({
            style: Toast.Style.Failure,
            title: `Raycast needs permission for your screenshots folder.`,
          });

        default:
          break;
      }
    }

    throw error;
  }
}
