import { exec } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";
import { escapeShellArg } from "../utils/escape";

// ============================================
// WezTerm Executor
// ============================================

export class WezTermExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    return new Promise((resolve, reject) => {
      // Escape path for safe shell usage
      const safePath = escapeShellArg(path);

      let cmd: string;
      if (command) {
        // Use sh -c with properly escaped arguments
        const shellScript = escapeShellArg(`${command}; exec $SHELL`);
        cmd = `wezterm start --cwd ${safePath} -- sh -c ${shellScript}`;
      } else {
        cmd = `wezterm start --cwd ${safePath}`;
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
