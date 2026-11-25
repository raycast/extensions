import { Clipboard, open, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import fs from "fs";
import { promisify } from "util";
import { isTooOld, MINIMUM_APP_VERSION, readInstalledVersion, RELEASES_URL } from "./data/appVersion";

const MPM_PATH = "/Applications/Mac Performance Monitor.app/Contents/MacOS/mpm";

const execFileAsync = promisify(execFile);

/**
 * Copies investigation instructions for an AI assistant to the clipboard.
 * Runs `mpm prompt`, the app's own command that prints ready-made AI instructions.
 */
export default async function Command() {
  try {
    // MINIMUM_APP_VERSION check for `mpm prompt`
    const installedVersion = await readInstalledVersion();
    if (installedVersion !== null && isTooOld(installedVersion)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Update Mac Performance Monitor",
        message:
          "Version " + installedVersion + " is installed. This command needs " + MINIMUM_APP_VERSION + " or later.",
        primaryAction: {
          title: "Open Releases Page",
          onAction: () => open(RELEASES_URL),
        },
      });
      return;
    }

    if (!fs.existsSync(MPM_PATH)) {
      throw new Error("mpm executable not found");
    }

    const result = await execFileAsync(MPM_PATH, ["prompt"], { timeout: 6000 });
    if (result.stdout.trim().length === 0) {
      throw new Error("Empty prompt output");
    }

    const promptText = result.stdout;
    await Clipboard.copy(promptText);
    await showHUD("Copied Instructions for Agents to Clipboard");
  } catch (err) {
    await showHUD(`Failed to copy AI instructions: ${String(err)}`);
  }
}
