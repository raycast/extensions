import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";
import { showToast, Toast, open, Clipboard } from "@raycast/api";

const execAsync = promisify(exec);

/**
 * Find the Twinkle Tray executable.
 * Checks the regular install path first, then the MS Store alias.
 */
export async function getTwinkleTrayExe(): Promise<string | null> {
  // Regular install (winget / standalone installer)
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const regularPath = join(localAppData, "Programs", "twinkle-tray", "Twinkle Tray.exe");
    if (existsSync(regularPath)) return `"${regularPath}"`;
  }

  // MS Store version (alias in PATH, available in v1.17.1+)
  try {
    await execAsync("where Twinkle-Tray.exe", { timeout: 5000 });
    return "Twinkle-Tray.exe";
  } catch {
    // Not found in PATH
  }

  return null;
}

/**
 * Check if Twinkle Tray is currently running.
 */
async function isTwinkleTrayRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("tasklist", { timeout: 10000 });
    return stdout.includes("Twinkle Tray.exe") || stdout.includes("Twinkle-Tray.exe");
  } catch {
    return false;
  }
}

/**
 * Start Twinkle Tray in the background.
 */
async function startTwinkleTray(exe: string): Promise<void> {
  execAsync(`start "" ${exe}`, { timeout: 10000 }).catch(() => {});
  // Wait for Twinkle Tray to initialize
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

/**
 * Install Twinkle Tray via winget.
 */
async function installTwinkleTray(): Promise<boolean> {
  try {
    await execAsync("winget install xanderfrangos.twinkletray --accept-source-agreements --accept-package-agreements", {
      timeout: 120000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure Twinkle Tray is installed and running.
 * Auto-installs via winget if not found, then starts it.
 * Returns the executable command, or null if not ready.
 */
export async function ensureTwinkleTrayReady(): Promise<string | null> {
  let exe = await getTwinkleTrayExe();

  if (!exe) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Installing Twinkle Tray",
      message: "Running winget install...",
    });

    const installed = await installTwinkleTray();
    if (!installed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Twinkle Tray Installation Failed",
        message: "Install Twinkle Tray to use this command",
        primaryAction: {
          title: "Open Twinkle Tray Website",
          onAction: () => open("https://twinkletray.com/"),
        },
        secondaryAction: {
          title: "Copy Winget Command",
          onAction: () => Clipboard.copy("winget install xanderfrangos.twinkletray"),
        },
      });
      return null;
    }

    exe = await getTwinkleTrayExe();
    if (!exe) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Twinkle Tray Not Found",
        message: "Installation succeeded but executable not found",
        primaryAction: {
          title: "Open Twinkle Tray Website",
          onAction: () => open("https://twinkletray.com/"),
        },
      });
      return null;
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Twinkle Tray Installed",
    });
  }

  // Ensure Twinkle Tray is running (required for CLI to work)
  if (!(await isTwinkleTrayRunning())) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Starting Twinkle Tray",
      message: "Please wait...",
    });
    await startTwinkleTray(exe);
  }

  return exe;
}

/**
 * Adjust brightness by offset for all monitors.
 */
export async function adjustBrightness(exe: string, offset: number): Promise<void> {
  await execAsync(`${exe} --All --Offset=${offset} --Overlay`, { timeout: 5000 });
}

/**
 * Set brightness to a specific level for all monitors.
 */
export async function setBrightness(exe: string, level: number): Promise<void> {
  await execAsync(`${exe} --All --Set=${level} --Overlay`, { timeout: 5000 });
}
