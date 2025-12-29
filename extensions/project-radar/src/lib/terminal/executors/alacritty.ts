import { exec } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";
import { escapeShellArg } from "../utils/escape";

// ============================================
// Alacritty Executor
// ============================================

export class AlacrittyExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    return new Promise((resolve, reject) => {
      // Escape path for safe shell usage
      const safePath = escapeShellArg(path);

      let cmd: string;
      if (command) {
        // Use sh -c with properly escaped arguments
        const shellScript = escapeShellArg(`${command}; exec $SHELL`);
        cmd = `alacritty --working-directory ${safePath} -e sh -c ${shellScript}`;
      } else {
        cmd = `alacritty --working-directory ${safePath}`;
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
