import { exec } from "child_process";
import { TerminalExecutor, TerminalExecuteParams } from "../types";

// ============================================
// Kitty Executor
// ============================================

export class KittyExecutor implements TerminalExecutor {
  async execute({ path, command }: TerminalExecuteParams): Promise<void> {
    const kittyPath = "/Applications/kitty.app/Contents/MacOS/kitty";

    return new Promise((resolve, reject) => {
      let cmd: string;
      if (command) {
        // Use shell to cd and run command
        cmd = `"${kittyPath}" --directory "${path}" sh -c "${command}; exec $SHELL"`;
      } else {
        cmd = `"${kittyPath}" --directory "${path}"`;
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
