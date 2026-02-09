import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function validateCliPath(cliPath: string): string {
  for (let i = 0; i < cliPath.length; i++) {
    const code = cliPath.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      throw new Error("CLI path contains invalid control characters. Please check your CLI Path preference.");
    }
  }
  return cliPath;
}

export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function openTerminalForLogin(): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const rawCliPath = preferences.cliPath || "pass-cli";
  const cliPath = validateCliPath(rawCliPath);

  const escapedCliPath = escapeAppleScriptString(cliPath);
  try {
    await execFileAsync("osascript", ["-e", `tell application "Terminal" to do script "${escapedCliPath} login"`]);
    await showToast({
      style: Toast.Style.Success,
      title: "Terminal opened",
      message: "Please complete login in Terminal",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Terminal",
      message,
    });
  }
}
