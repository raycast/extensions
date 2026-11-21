import { exec, execFile } from "child_process";
import { promisify } from "util";
import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { BrowserType } from "../types";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export async function openBrowserTaskManager(
  browserType: BrowserType,
): Promise<void> {
  try {
    if (browserType === "firefox") {
      const script = `
        tell application "Firefox"
          activate
          open location "about:processes"
        end tell
      `;
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      await closeMainWindow();
      return;
    }

    if (browserType === "chrome") {
      const script = `
        tell application "Google Chrome"
          activate
        end tell
        tell application "System Events"
          tell process "Google Chrome"
            try
              click menu item "Task Manager" of menu "Window" of menu bar 1
            on error
              tell application "Google Chrome"
                open location "chrome://discards"
              end tell
            end try
          end tell
        end tell
      `;
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      await closeMainWindow();
      return;
    }

    if (browserType === "brave") {
      const script = `
        tell application "Brave Browser"
          activate
        end tell
        tell application "System Events"
          tell process "Brave Browser"
            try
              click menu item "Task Manager" of menu "Window" of menu bar 1
            on error
              tell application "Brave Browser"
                open location "brave://discards"
              end tell
            end try
          end tell
        end tell
      `;
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      await closeMainWindow();
      return;
    }

    if (browserType === "edge") {
      const script = `
        tell application "Microsoft Edge"
          activate
        end tell
        tell application "System Events"
          tell process "Microsoft Edge"
            try
              click menu item "Browser Task Manager" of menu "Window" of menu bar 1
            on error
              tell application "Microsoft Edge"
                open location "edge://discards"
              end tell
            end try
          end tell
        end tell
      `;
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      await closeMainWindow();
      return;
    }

    if (browserType === "arc") {
      const script = `
        tell application "Arc"
          activate
          open location "arc://discards"
        end tell
      `;
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      await closeMainWindow();
      return;
    }

    if (browserType === "safari") {
      await execAsync(`open -a Safari`);
      await closeMainWindow();
      return;
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open browser task manager",
      message: String(error),
    });
  }
}

export async function killProcessByPid(
  pid: number,
  signal: "SIGTERM" | "SIGKILL" = "SIGTERM",
): Promise<boolean> {
  try {
    await execFileAsync("kill", [
      `-${signal === "SIGTERM" ? "15" : "9"}`,
      String(pid),
    ]);
    await showToast({
      style: Toast.Style.Success,
      title: `Terminated Process ${pid}`,
      message: `Sent ${signal}`,
    });
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to terminate process ${pid}`,
      message: String(error),
    });
    return false;
  }
}

export async function openInActivityMonitor(): Promise<void> {
  try {
    await execAsync(`open -a "Activity Monitor"`);
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Activity Monitor",
      message: String(error),
    });
  }
}
