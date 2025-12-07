import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import path from "path";

const execAsync = promisify(exec);

export default async (): Promise<void> => {
  try {
    await showToast(Toast.Style.Animated, "Clearing downloaded casks and formulae...");

    const extensionPath = path.join(homedir(), "Library/Application Support/com.raycast.macos/extensions/brew");

    const filesToDelete = ["formula.json", "cask.json", "installedv2.json"]
      .map((file) => `"${path.join(extensionPath, file)}"`)
      .join(" ");

    await execAsync(`rm -f ${filesToDelete}`);

    await showToast(Toast.Style.Success, "Cache files cleared");
  } catch (err) {
    await showToast(Toast.Style.Failure, "Failed to clear cache", (err as Error).message);
  }
};
