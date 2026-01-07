import { execFile } from "child_process";
import { promisify } from "util";
import { TerminalAdapter } from "../types";

const execFileAsync = promisify(execFile);

export class WarpAdapter implements TerminalAdapter {
  name = "Warp";
  bundleId = "dev.warp.Warp-Stable";

  async open(directory: string): Promise<void> {
    // 1. Open Warp at the target directory
    await execFileAsync("open", ["-a", "Warp", directory]);

    // 2. Use AppleScript to type the command and press Enter
    const script = `
      delay 0.5
      tell application "System Events"
        tell process "Warp"
          set frontmost to true
          keystroke "claude"
          delay 1
          key code 36
        end tell
      end tell
    `;

    await execFileAsync("osascript", ["-e", script]);
  }
}
