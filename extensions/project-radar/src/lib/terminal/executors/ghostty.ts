import { exec } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";

// ============================================
// Ghostty Executor
// ============================================

export class GhosttyExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    return new Promise((resolve, reject) => {
      let cmd: string;
      if (command) {
        // Ghostty supports -e flag for command execution
        cmd = `open -na Ghostty.app --args --working-directory="${path}" -e sh -c "${command}; exec $SHELL"`;
      } else {
        cmd = `open -na Ghostty.app --args --working-directory="${path}"`;
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
