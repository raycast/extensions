import { closeMainWindow, environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_DURATION_SECONDS = 60;
const MIN_DURATION_SECONDS = 10;
const MAX_DURATION_SECONDS = 600;

export default async function command() {
  const preferences = getPreferenceValues<Preferences.Blackr>();
  const durationSeconds = normalizeDuration(preferences.durationSeconds);

  try {
    await closeMainWindow({ clearRootSearch: true });

    if (process.platform === "darwin") {
      const { blackrOverlay } = await import("swift:../swift/blackr-overlay");
      await blackrOverlay(durationSeconds);
      return;
    }

    if (process.platform === "win32") {
      await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          join(environment.assetsPath, "blackr-overlay.ps1"),
          String(durationSeconds),
        ],
        {
          timeout: (durationSeconds + 5) * 1000,
          windowsHide: true,
        },
      );
      return;
    }

    throw new Error(`Blackr is not supported on ${process.platform}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to start Blackr",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function normalizeDuration(value: string | undefined): number {
  const parsedValue = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_DURATION_SECONDS;
  }

  return Math.min(Math.max(parsedValue, MIN_DURATION_SECONDS), MAX_DURATION_SECONDS);
}
