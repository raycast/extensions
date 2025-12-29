import { runAppleScript } from "@raycast/utils";
import { TerminalExecutor, TerminalExecuteParams } from "../types";

// ============================================
// Warp Executor (UI Scripting via clipboard)
// ============================================

export class WarpExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    const fullCommand = command ? `cd '${path}' && ${command}` : `cd '${path}'`;

    // Escape for AppleScript string (backslash and double quote)
    const escapedCommand = fullCommand.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    // Use AppleScript to activate Warp and type the command
    // Based on tested working script format
    const script = `
      set theCommand to "${escapedCommand}"
      set the clipboard to theCommand
      tell application "Warp" to activate
      delay 0.5
      tell application "System Events" to tell process "Warp" to keystroke "t" using command down
      delay 1
      tell application "System Events" to keystroke "v" using command down
      delay 1
      tell application "System Events" to key code 36
    `;

    await runAppleScript(script, { timeout: 15000 });
  }
}
