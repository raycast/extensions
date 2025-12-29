import { runAppleScript } from "@raycast/utils";
import { TerminalExecutor, TerminalExecuteParams } from "../types";
import { escapeShellArg, escapeAppleScriptString } from "../utils/escape";

// ============================================
// iTerm2 Executor
// ============================================

export class ITerm2Executor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    // Build safe shell command with escaped arguments
    const safePath = escapeShellArg(path);
    const script = command ? `cd ${safePath} && ${escapeShellArg(command)}` : `cd ${safePath}`;

    // Escape for AppleScript string
    const escapedScript = escapeAppleScriptString(script);

    const appleScript = `
      tell application "iTerm2"
        create window with default profile
        tell current session of current window
          write text "${escapedScript}"
        end tell
      end tell
    `;

    await runAppleScript(appleScript);
  }
}
