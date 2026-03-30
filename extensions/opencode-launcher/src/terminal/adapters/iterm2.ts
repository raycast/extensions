import { runAppleScript } from "@raycast/utils";
import type { TerminalAdapter } from "../types";
import { escapeAppleScript } from "../utils";

export const iTerm2Adapter: TerminalAdapter = {
  name: "iTerm2",
  bundleId: "com.googlecode.iterm2",
  async open(command: string): Promise<void> {
    const escaped = escapeAppleScript(command);

    await runAppleScript(`
      tell application "iTerm2"
        activate
        create window with default profile
        delay 0.3
        tell current session of current window
          write text "${escaped}"
        end tell
      end tell
    `);
  },
};
