import { showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { terminalLoginScript } from "./core/terminal-login";
import { getCliPath } from "./pass-cli";

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

export async function openTerminalForLogin(): Promise<void> {
  if (process.platform !== "darwin") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unsupported Platform",
      message: "Opening Terminal login is only supported on macOS.",
    });
    return;
  }

  try {
    // The same pass-cli as every other call of the extension, not whichever one the shell's PATH finds.
    const cliPath = validateCliPath(await getCliPath());
    await execFileAsync("osascript", ["-e", terminalLoginScript(cliPath)]);
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
