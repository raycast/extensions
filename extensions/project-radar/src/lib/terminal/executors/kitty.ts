import { exec } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";
import { escapeShellArg } from "../utils/escape";

// ============================================
// Kitty Executor
// ============================================

export class KittyExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    const kittyPath = "/Applications/kitty.app/Contents/MacOS/kitty";

    return new Promise((resolve, reject) => {
      // Escape path for safe shell usage
      const safePath = escapeShellArg(path);

      let cmd: string;
      if (command) {
        // Use sh -c with properly escaped arguments
        const shellScript = escapeShellArg(`${command}; exec $SHELL`);
        cmd = `${escapeShellArg(kittyPath)} --directory ${safePath} sh -c ${shellScript}`;
      } else {
        cmd = `${escapeShellArg(kittyPath)} --directory ${safePath}`;
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
