import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import type { TerminalAdapter } from "../types";
import { escapeAppleScript } from "../utils";

const execFileAsync = promisify(execFile);

export const ghosttyAdapter: TerminalAdapter = {
  name: "Ghostty",
  bundleId: "com.mitchellh.ghostty",
  async open(command: string): Promise<void> {
    const escaped = escapeAppleScript(command);

    await execFileAsync("open", ["-a", "Ghostty"]);
    await runAppleScript(`
      tell application "Ghostty" to activate
      delay 0.3
      tell application "System Events"
        keystroke "n" using command down
        delay 0.2
        keystroke "${escaped}"
        key code 36
      end tell
    `);
  },
};
