import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { Preferences } from "./types";

const execFileAsync = promisify(execFile);

export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function openTerminalForLogin(): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const cliPath = preferences.cliPath || "pass-cli";

  if (process.platform === "win32") {
    try {
      await execFileAsync("cmd", ["/c", "start", "cmd", "/k", cliPath, "login"]);
      await showToast({
        style: Toast.Style.Success,
        title: "Terminal opened",
        message: "Please complete login in Command Prompt",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open Terminal",
        message,
      });
    }
  } else {
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
}
