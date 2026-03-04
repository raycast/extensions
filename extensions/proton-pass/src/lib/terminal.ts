import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function validateCliPath(cliPath: string): string {
  if (cliPath.trim().length === 0) {
    throw new Error("CLI path cannot be empty. Please check your CLI Path preference.");
  }

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

function buildTerminalLoginScript(cliPath: string): string {
  const escapedCliPath = escapeAppleScriptString(cliPath);
  return `tell application "Terminal" to do script "${escapedCliPath} login"`;
}

export async function openTerminalForLogin(): Promise<void> {
  if (process.platform !== "darwin") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unsupported Platform",
      message: "Opening Terminal login is only supported on macOS.",
    });
    return;
  }

  const preferences = getPreferenceValues<{ cliPath?: string }>();
  const rawCliPath = preferences.cliPath || "pass-cli";
  const cliPath = validateCliPath(rawCliPath);

  try {
    await execFileAsync("osascript", ["-e", buildTerminalLoginScript(cliPath)]);
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
