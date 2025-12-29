import { exec } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";

// ============================================
// WezTerm Executor
// ============================================

export class WezTermExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    return new Promise((resolve, reject) => {
      let cmd: string;
      if (command) {
        // WezTerm uses --cwd for working directory and supports command execution
        cmd = `wezterm start --cwd "${path}" -- sh -c "${command}; exec $SHELL"`;
      } else {
        cmd = `wezterm start --cwd "${path}"`;
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
