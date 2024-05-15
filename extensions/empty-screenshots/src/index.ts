import { readdir, stat, rm } from "fs/promises";
import { join, resolve } from "path";
import { homedir } from "os";
import { showToast, Toast, showHUD, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";

interface Preferences {
  screenshotBehavior: string;
  daysToKeep: string;
  screenshotFolder: string;
  prefixString: string;
}

async function moveToTrash(filePath: string) {
  return new Promise((resolve, reject) => {
    exec(`osascript -e 'tell application "Finder" to delete POSIX file "${filePath}"'`, (error, stdout, stderr) => {
      if (error) {
        console.error("Error moving file to Trash:", stderr);
        reject(error);
      } else {
        console.log("File moved to Trash:", stdout);
        resolve(stdout);
      }
    });
  });
}

export default async function main() {
  const { daysToKeep, screenshotFolder, screenshotBehavior, prefixString } = getPreferenceValues<Preferences>();
  const numberOfDays = parseInt(daysToKeep, 10);
  const folder = resolve(screenshotFolder.replace("~", homedir()));

  try {
    const files = await readdir(folder);

    const screenshots = files
      .filter((file) => {
        const endsWithValidExtension = file.endsWith(".png") || file.endsWith(".mov");
        let startsWithValidPrefix = false;

        if (prefixString) {
          startsWithValidPrefix = file.startsWith(prefixString);
        } else {
          startsWithValidPrefix = file.startsWith("CleanShot") || file.startsWith("Screen");
        }

        return endsWithValidExtension && startsWithValidPrefix;
      })
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
        if (screenshotBehavior === "0") {
          await rm(screenshot);
        } else {
          await moveToTrash(screenshot);
        }
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
