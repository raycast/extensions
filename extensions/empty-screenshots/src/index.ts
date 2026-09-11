import { readdir, stat } from "fs/promises";
import { join, resolve } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
import { showToast, Toast, showHUD, getPreferenceValues, trash } from "@raycast/api";

const MACOS_SCREENSHOT_PATTERN = /^Screen(shot| Recording) \d{4}-\d{2}-\d{2}/;

function getMacOSScreenshotFolder(): string {
  try {
    const location = execSync("defaults read com.apple.screencapture location", {
      encoding: "utf-8",
    }).trim();

    return resolve(location.replace("~", homedir()));
  } catch {
    return join(homedir(), "Desktop");
  }
}

export default async function main() {
  const { daysToKeep, screenshotFolder, useMacOSDefaults } = getPreferenceValues<Preferences.Index>();
  const numberOfDays = parseInt(daysToKeep, 10);
  const folder = useMacOSDefaults ? getMacOSScreenshotFolder() : resolve(screenshotFolder.replace("~", homedir()));

  try {
    const files = await readdir(folder);

    const screenshots = files
      .filter(
        (file) =>
          (file.endsWith(".png") || file.endsWith(".mov")) &&
          (useMacOSDefaults ? MACOS_SCREENSHOT_PATTERN.test(file) : true),
      )
      .map((file) => join(folder, file));

    const today = new Date();
    const priorDate = new Date(new Date().setDate(today.getDate() - numberOfDays));

    await showToast({
      style: Toast.Style.Animated,
      title:
        numberOfDays === 0
          ? "🗑️ Cleaning all screenshots"
          : `🗑️  Cleaning screenshots older than ${numberOfDays} day${numberOfDays === 1 ? "" : "s"}`,
    });

    let cleanedCount = 0;

    for (const screenshot of screenshots) {
      if (numberOfDays > 0) {
        const stats = await stat(screenshot);
        if (stats.birthtimeMs > priorDate.getTime()) {
          continue;
        }
      }

      await trash(screenshot);
      cleanedCount = cleanedCount + 1;
    }

    await showHUD(`✅ Cleaned ${cleanedCount} screenshot${cleanedCount === 1 ? "" : "s"}`);
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
