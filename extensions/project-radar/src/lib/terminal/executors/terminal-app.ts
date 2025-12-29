import { runAppleScript } from "@raycast/utils";
import { TerminalExecutor, TerminalExecuteParams } from "../types";
import { escapeShellArg, escapeAppleScriptString } from "../utils/escape";

// ============================================
// Terminal.app Executor (macOS built-in)
// ============================================

export class TerminalAppExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    // Build safe shell command with escaped arguments
    const safePath = escapeShellArg(path);
    const script = command ? `cd ${safePath} && ${escapeShellArg(command)}` : `cd ${safePath}`;

    // Escape for AppleScript string
    const escapedScript = escapeAppleScriptString(script);
    const appleScript = `tell application "Terminal" to do script "${escapedScript}"`;

    await runAppleScript(appleScript);
  }
}
