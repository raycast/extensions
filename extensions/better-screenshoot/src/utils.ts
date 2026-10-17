import { execFile } from "child_process";
import { promisify } from "util";
import { showHUD, showToast, Toast } from "@raycast/api";

const execFileAsync = promisify(execFile);

const DOWNLOAD_URL = "https://github.com/sriverogalan/better-screenshoot/releases/latest";

export async function runBetterScreenshootAction(action: string, successMessage: string): Promise<void> {
  const url = `betterscreenshoot://${action}`;

  try {
    await execFileAsync("open", [url]);
    await showHUD(successMessage);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Better Screenshoot",
      message: "Install the app, enable Allow external control in Settings, then try again.",
      primaryAction: {
        title: "Download",
        onAction: () => {
          void execFileAsync("open", [DOWNLOAD_URL]);
        },
      },
    });
  }
}
