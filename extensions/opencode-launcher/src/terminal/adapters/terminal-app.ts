import { runAppleScript } from "@raycast/utils";
import type { TerminalAdapter } from "../types";
import { escapeAppleScript } from "../utils";

export const terminalAppAdapter: TerminalAdapter = {
  name: "Terminal",
  bundleId: "com.apple.Terminal",
  async open(command: string): Promise<void> {
    const escaped = escapeAppleScript(command);

    await runAppleScript(`
      tell application "Terminal"
        activate
        do script "${escaped}"
      end tell
    `);
  },
};
