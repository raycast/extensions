import { execFile, exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";
import { showToast, Toast, open, Clipboard, confirmAlert } from "@raycast/api";

const execFileAsync = promisify(execFile);
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
    if (existsSync(regularPath)) return regularPath;
  }

  // MS Store version (alias in PATH, available in v1.17.1+)
  try {
    const { stdout } = await execAsync("where Twinkle-Tray.exe", { timeout: 5000 });
    const exePath = stdout.trim().split("\n")[0].trim();
    if (exePath) return exePath;
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
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Twinkle Tray.exe" /NH', { timeout: 10000 });
    if (stdout.includes("Twinkle Tray.exe")) return true;

    const { stdout: stdout2 } = await execAsync('tasklist /FI "IMAGENAME eq Twinkle-Tray.exe" /NH', { timeout: 10000 });
    return stdout2.includes("Twinkle-Tray.exe");
  } catch {
    return false;
  }
}

/**
 * Start Twinkle Tray in the background and poll until it's running.
 */
async function startTwinkleTray(exe: string): Promise<void> {
  execFileAsync(exe).catch(() => {});

  const maxAttempts = 15;
  const interval = 500;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    if (await isTwinkleTrayRunning()) return;
  }
}

/**
 * Install Twinkle Tray via winget.
 */
async function installTwinkleTray(): Promise<boolean> {
  try {
    await execFileAsync(
      "winget",
      ["install", "xanderfrangos.twinkletray", "--accept-source-agreements", "--accept-package-agreements"],
      { timeout: 120000 }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure Twinkle Tray is installed and running.
 * Prompts the user before installing via winget if not found, then starts it.
 * Returns the executable path, or null if not ready.
 */
export async function ensureTwinkleTrayReady(): Promise<string | null> {
  let exe = await getTwinkleTrayExe();

  if (!exe) {
    const confirmed = await confirmAlert({
      title: "Twinkle Tray Not Found",
      message: "Twinkle Tray is required for brightness control on Windows. Install it now via winget?",
      primaryAction: { title: "Install" },
      dismissAction: { title: "Cancel" },
    });

    if (!confirmed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Twinkle Tray Required",
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
  await execFileAsync(exe, ["--All", `--Offset=${offset}`, "--Overlay"], { timeout: 5000 });
}

/**
 * Set brightness to a specific level for all monitors.
 */
export async function setBrightness(exe: string, level: number): Promise<void> {
  await execFileAsync(exe, ["--All", `--Set=${level}`, "--Overlay"], { timeout: 5000 });
}
