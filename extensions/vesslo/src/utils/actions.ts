import { open, showToast, Toast, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { getBrewPath } from "./brew";

const execAsync = promisify(exec);

export const VESSLO_URL_SCHEME = "vesslo://";

export async function openInVesslo(bundleId: string) {
  try {
    await closeMainWindow();
    await open(`${VESSLO_URL_SCHEME}app/${bundleId}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Vesslo",
      message: String(error).slice(0, 100),
    });
  }
}

export function getAppStoreUrl(appStoreId: string): string {
  return `macappstore://apps.apple.com/app/id${appStoreId}`;
}

export async function runBrewUpgrade(caskName: string, appName: string) {
  const brewPath = getBrewPath();

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${appName}...`,
    });

    const { stdout, stderr } = await execAsync(
      `${brewPath} upgrade --cask ${JSON.stringify(caskName)} 2>&1`,
    );

    const output = stdout + stderr;

    // Check if already up-to-date (explicit messages only)
    if (
      output.includes("already installed") ||
      output.includes("up-to-date") ||
      output.includes("No cask to upgrade")
    ) {
      await showToast({
        style: Toast.Style.Success,
        title: `${appName} is up-to-date`,
        message: "No update needed",
      });
      return;
    }

    // Update succeeded - check if app was running (needs restart)
    // Homebrew updates files even if app is running, but needs restart to apply
    const wasRunning =
      output.includes("currently running") ||
      output.includes("currently open") ||
      output.includes("Please quit");

    if (wasRunning) {
      await showToast({
        style: Toast.Style.Success,
        title: `${appName} updated!`,
        message: "Restart app to apply changes",
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: `${appName} updated!`,
        message: output?.slice(0, 100) || "Update complete",
      });
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message.slice(0, 100) : "Unknown error";

    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to update ${appName}`,
      message: errorMessage,
    });
  }
}

export async function runBrewUpgradeInTerminal(caskName: string) {
  const brewPath = getBrewPath();
  const command = `${brewPath} upgrade --cask ${caskName}`;

  try {
    await closeMainWindow();
    // If Terminal window exists, run immediately; otherwise create new and wait
    await execAsync(
      `osascript -e 'tell application "Terminal"
        activate
        if (count of windows) > 0 then
          do script "${command}" in front window
        else
          do script ""
          delay 3
          do script "${command}" in front window
        end if
      end tell'`,
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Terminal",
      message: String(error).slice(0, 100),
    });
  }
}

export async function runMasUpgradeInTerminal(appStoreId: string) {
  const command = `mas upgrade ${appStoreId}`;

  try {
    await closeMainWindow();
    // If Terminal window exists, run immediately; otherwise create new and wait
    await execAsync(
      `osascript -e 'tell application "Terminal"
        activate
        if (count of windows) > 0 then
          do script "${command}" in front window
        else
          do script ""
          delay 3
          do script "${command}" in front window
        end if
      end tell'`,
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Terminal",
      message: String(error).slice(0, 100),
    });
  }
}
