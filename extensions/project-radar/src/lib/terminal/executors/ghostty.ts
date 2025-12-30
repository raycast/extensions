import { exec } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";
import { escapeShellArg } from "../utils/escape";

// ============================================
// Ghostty Executor
// ============================================

export class GhosttyExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    return new Promise((resolve, reject) => {
      // Escape path for safe shell usage
      const safePath = escapeShellArg(path);

      let cmd: string;
      if (command) {
        // Command is user-configured and trusted - don't escape it
        // as it may contain arguments (e.g., "claude --help", "npm run dev")
        // Only escape the entire shell script for the outer exec() shell
        const shellScript = escapeShellArg(`${command}; exec $SHELL`);
        cmd = `open -na Ghostty.app --args --working-directory=${safePath} -e sh -c ${shellScript}`;
      } else {
        cmd = `open -na Ghostty.app --args --working-directory=${safePath}`;
      }

      exec(cmd, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
