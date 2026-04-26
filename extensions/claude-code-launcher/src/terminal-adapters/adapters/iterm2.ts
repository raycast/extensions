import { execFile } from "child_process";
import { promisify } from "util";
import { TerminalAdapter } from "../types";

const execFileAsync = promisify(execFile);

export class ITerm2Adapter implements TerminalAdapter {
  name = "iTerm2";
  bundleId = "com.googlecode.iterm2";

  async open(directory: string): Promise<void> {
    const userShell = process.env.SHELL || "/bin/zsh";
    const command = `clear && claude ; exec ${userShell} -l`;

    await execFileAsync("open", ["-a", "iTerm", directory]);

    const script = `
      tell application "iTerm2"
        repeat until application "iTerm2" is frontmost
          delay 0.1
        end repeat
        delay 0.3
        tell current window
          tell current session
            write text ${this.appleScriptEscape(command)}
          end tell
        end tell
      end tell
    `;

    await execFileAsync("osascript", ["-e", script]);
  }

  private appleScriptEscape(str: string): string {
    return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
}
