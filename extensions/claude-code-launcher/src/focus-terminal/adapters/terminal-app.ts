import { execFile } from "child_process";
import { promisify } from "util";
import { FocusAdapter } from "../types";

const execFileAsync = promisify(execFile);

export class TerminalAppFocusAdapter implements FocusAdapter {
  name = "Terminal";

  matches(command: string): boolean {
    return /Terminal\.app\//.test(command);
  }

  // Focus the Terminal.app tab attached to the given tty.
  async focusSession(ttyPath: string): Promise<boolean> {
    const script = `
      on run argv
        set targetTty to item 1 of argv
        tell application "Terminal"
          repeat with w in windows
            repeat with t in tabs of w
              if tty of t is targetTty then
                set selected of t to true
                set index of w to 1
                activate
                return "found"
              end if
            end repeat
          end repeat
        end tell
        return "missing"
      end run
    `;
    const { stdout } = await execFileAsync("osascript", ["-e", script, ttyPath]);
    return stdout.trim() === "found";
  }
}
