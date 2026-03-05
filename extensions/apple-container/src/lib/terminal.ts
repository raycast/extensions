import { execFile } from "child_process";
import { promisify } from "util";
import { getApplications } from "@raycast/api";

const execFileAsync = promisify(execFile);

async function hasITerm(): Promise<boolean> {
  try {
    const apps = await getApplications();
    return apps.some((a) => a.bundleId === "com.googlecode.iterm2");
  } catch {
    return false;
  }
}

export async function openTerminalWithCommand(command: string): Promise<void> {
  if (await hasITerm()) {
    await execFileAsync("osascript", [
      "-e",
      `tell application "iTerm"
        activate
        set newWindow to (create window with default profile)
        tell current session of newWindow
          write text ${JSON.stringify(command)}
        end tell
      end tell`,
    ]);
  } else {
    await execFileAsync("osascript", [
      "-e",
      `tell application "Terminal"
        activate
        do script ${JSON.stringify(command)}
      end tell`,
    ]);
  }
}
