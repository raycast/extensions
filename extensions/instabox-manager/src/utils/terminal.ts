import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { spawn } from "node:child_process";

function appleScriptString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Opens a new terminal window that runs `command`. */
export async function openInTerminal(command: string) {
  if (process.platform === "win32") {
    // Verbatim so `start` sees the quoted window title instead of treating it as the program.
    const child = spawn("cmd.exe", ["/c", `start "InstaBox" cmd.exe /k ${command}`], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      windowsVerbatimArguments: true,
    });
    child.unref();
    return;
  }

  const { terminalApp } = getPreferenceValues<Preferences>();
  if (terminalApp === "iterm") {
    await runAppleScript(`
      tell application "iTerm"
        activate
        set newWindow to (create window with default profile)
        tell current session of newWindow
          write text ${appleScriptString(command)}
        end tell
      end tell
    `);
    return;
  }

  await runAppleScript(`
    tell application "Terminal"
      activate
      do script ${appleScriptString(command)}
    end tell
  `);
}
