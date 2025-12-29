import { execSync } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";

// ============================================
// Terminal.app Executor (macOS built-in)
// ============================================

export class TerminalAppExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    const script = command ? `cd "${path}" && ${command}` : `cd "${path}"`;

    // Escape double quotes for AppleScript
    const escapedScript = script.replace(/"/g, '\\"');
    const appleScript = `tell application "Terminal" to do script "${escapedScript}"`;

    execSync(`osascript -e '${appleScript}'`);
  }
}
