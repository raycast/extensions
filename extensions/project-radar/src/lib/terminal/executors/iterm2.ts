import { execSync } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";

// ============================================
// iTerm2 Executor
// ============================================

export class ITerm2Executor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    const script = command ? `cd "${path}" && ${command}` : `cd "${path}"`;

    // Escape double quotes for AppleScript
    const escapedScript = script.replace(/"/g, '\\"');

    // Use multiple -e flags to build the AppleScript
    const appleScriptParts = [
      'tell application "iTerm2"',
      "create window with default profile",
      "tell current session of current window",
      `write text "${escapedScript}"`,
      "end tell",
      "end tell",
    ];

    const args = appleScriptParts.map((part) => `-e '${part}'`).join(" ");
    execSync(`osascript ${args}`);
  }
}
