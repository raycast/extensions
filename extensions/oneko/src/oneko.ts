import { captureException, Clipboard, getApplications, open, showToast, Toast } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export const BREW_COMMAND = "brew install --cask oneko-swift/tap/oneko";
const BUNDLE_ID = "app.oneko.oneko";

/// All control goes through the app's oneko:// URL scheme; `open` also
/// launches the app when it isn't running yet.
export async function send(command: string): Promise<boolean> {
  try {
    await open(`oneko://${command}`);
    return true;
  } catch (error) {
    captureException(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not control Oneko",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function onekoInstalled(): Promise<boolean> {
  const apps = await getApplications();
  return apps.some((app) => app.bundleId?.toLowerCase() === BUNDLE_ID);
}

/// Guard for every command: without the app installed there is nothing to
/// control, so point at the Homebrew cask instead.
export async function requireOneko(): Promise<boolean> {
  if (await onekoInstalled()) return true;
  await showToast({
    style: Toast.Style.Failure,
    title: "Oneko is not installed",
    message: BREW_COMMAND,
    primaryAction: {
      title: "Copy Brew Command",
      onAction: () => Clipboard.copy(BREW_COMMAND),
    },
  });
  return false;
}

export async function onekoRunning(): Promise<boolean> {
  try {
    await execAsync("pgrep -x Oneko");
    return true;
  } catch {
    return false;
  }
}

/// Best-effort peek at the app's settings, for marking the current choice in
/// pickers. Returns undefined when the key was never written.
export async function readSetting(key: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync(`defaults read app.oneko.Oneko ${key}`);
    return stdout.trim();
  } catch {
    return undefined;
  }
}
