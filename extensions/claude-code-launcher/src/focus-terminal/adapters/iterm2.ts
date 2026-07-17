import { execFile } from "child_process";
import { promisify } from "util";
import { FocusAdapter } from "../types";

const execFileAsync = promisify(execFile);

export class ITerm2FocusAdapter implements FocusAdapter {
  name = "iTerm2";

  matches(command: string): boolean {
    return /iTerm/i.test(command);
  }

  // Focus the iTerm2 session attached to the given tty.
  async focusSession(ttyPath: string): Promise<boolean> {
    const script = `
      on run argv
        set targetTty to item 1 of argv
        tell application "iTerm2"
          repeat with w in windows
            repeat with t in tabs of w
              repeat with s in sessions of t
                if tty of s is targetTty then
                  select w
                  select t
                  select s
                  activate
                  return "found"
                end if
              end repeat
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
