import { runAppleScript } from "@raycast/utils";

import type { TerminalApp } from "./types";

function escapeForAppleScript(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export async function runInTerminal(
  command: string,
  app: TerminalApp,
): Promise<void> {
  const escaped = escapeForAppleScript(command);
  if (app === "iTerm") {
    await runAppleScript(`
      tell application "iTerm"
        activate
        if (count of windows) = 0 then
          create window with default profile
        else
          tell current window to create tab with default profile
        end if
        tell current session of current window to write text "${escaped}"
      end tell
    `);
    return;
  }
  await runAppleScript(`
    tell application "Terminal"
      activate
      do script "${escaped}"
    end tell
  `);
}
