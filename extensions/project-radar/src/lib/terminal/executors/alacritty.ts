import { exec } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";

// ============================================
// Alacritty Executor
// ============================================

export class AlacrittyExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    return new Promise((resolve, reject) => {
      let cmd: string;
      if (command) {
        // Use shell to run command and stay in shell
        cmd = `alacritty --working-directory "${path}" -e sh -c "${command}; exec $SHELL"`;
      } else {
        cmd = `alacritty --working-directory "${path}"`;
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
