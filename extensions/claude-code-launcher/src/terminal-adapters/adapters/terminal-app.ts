import { execFile } from "child_process";
import { promisify } from "util";
import { TerminalAdapter } from "../types";

const execFileAsync = promisify(execFile);

export class TerminalAppAdapter implements TerminalAdapter {
  name = "Terminal";
  bundleId = "com.apple.Terminal";

  async open(directory: string, claudeBinary: string): Promise<void> {
    const userShell = process.env.SHELL || "/bin/zsh";

    const script = `
      on run argv
        set targetDir to item 1 of argv
        set claudePath to item 2 of argv  
        set shellPath to item 3 of argv
        
        tell application "Terminal"
          do script "cd " & quoted form of targetDir & " && clear && " & quoted form of claudePath & " ; exec " & shellPath
          activate
        end tell
      end run
    `;

    await execFileAsync("osascript", ["-e", script, directory, claudeBinary, userShell]);
  }
}
