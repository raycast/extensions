import { runAppleScript } from "@raycast/utils";
import { TerminalExecutor, TerminalExecuteParams } from "../types";
import { escapeShellArg, escapeAppleScriptString } from "../utils/escape";

// ============================================
// Warp Executor (UI Scripting via clipboard)
// ============================================

// Note: Warp doesn't support standard AppleScript commands for running scripts.
// We use clipboard + keystroke simulation as a workaround.
// The delays are necessary to ensure Warp is ready to receive input.

export class WarpExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    // Build safe shell command with escaped path
    const safePath = escapeShellArg(path);
    const fullCommand = command ? `cd ${safePath} && ${escapeShellArg(command)}` : `cd ${safePath}`;

    // Escape for AppleScript string
    const escapedCommand = escapeAppleScriptString(fullCommand);

    // Use AppleScript to activate Warp and type the command
    const script = `
      set theCommand to "${escapedCommand}"
      set the clipboard to theCommand
      tell application "Warp" to activate
      delay 0.3
      tell application "System Events" to tell process "Warp" to keystroke "t" using command down
      delay 0.5
      tell application "System Events" to keystroke "v" using command down
      delay 1
      tell application "System Events" to key code 36
    `;

    await runAppleScript(script, { timeout: 15000 });
  }
}
