import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { promisify } from "util";
import { FocusAdapter } from "../types";

const execFileAsync = promisify(execFile);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GhosttyFocusAdapter implements FocusAdapter {
  name = "Ghostty";

  matches(command: string): boolean {
    return /Ghostty/i.test(command);
  }

  // Focus the Ghostty surface attached to the given tty. Ghostty's AppleScript API
  // (1.3+) exposes no tty, so the surface is identified by briefly setting a unique
  // title marker through the tty itself, then restored. Handled inside Ghostty (not
  // the Accessibility API), `focus` reaches windows on other Spaces, fullscreen
  // included. Returns false when the marker never shows up (session hosted by
  // another Ghostty instance, AppleScript disabled, or Ghostty < 1.3).
  async focusSession(ttyPath: string): Promise<boolean> {
    try {
      const titlesBefore = await this.listTerminals();
      const marker = `claude-code-launcher-${randomUUID()}`;
      await this.writeTerminalTitle(ttyPath, marker);
      let focusedId: string | undefined;
      try {
        for (let attempt = 0; attempt < 5 && !focusedId; attempt++) {
          focusedId = await this.focusTerminalByName(marker);
          if (!focusedId) await delay(150);
        }
      } finally {
        // Claude repaints its title on activity, but restore the pre-marker title
        // anyway so idle sessions don't keep the marker (blank when unknown).
        await this.writeTerminalTitle(ttyPath, (focusedId && titlesBefore.get(focusedId)) || "").catch(() => undefined);
      }
      return focusedId !== undefined;
    } catch {
      return false;
    }
  }

  // Set the terminal title by writing an OSC 2 escape straight to the session's
  // tty device. The hosting emulator applies it to whichever surface owns the tty.
  private async writeTerminalTitle(ttyPath: string, title: string): Promise<void> {
    await execFileAsync("/bin/sh", ["-c", 'printf "\\033]2;%s\\007" "$1" > "$2"', "_", title, ttyPath]);
  }

  private async listTerminals(): Promise<Map<string, string>> {
    const script = `
      -- Bind the separator before the tell block: inside it, "tab" is Ghostty's tab class
      set sep to tab
      set out to ""
      tell application "Ghostty"
        repeat with w in windows
          repeat with t in tabs of w
            repeat with s in terminals of t
              set out to out & (id of s) & sep & (name of s) & linefeed
            end repeat
          end repeat
        end repeat
      end tell
      return out
    `;
    const { stdout } = await execFileAsync("osascript", ["-e", script]);
    const terminals = new Map<string, string>();
    for (const line of stdout.split("\n")) {
      const tabIndex = line.indexOf("\t");
      if (tabIndex > 0) terminals.set(line.slice(0, tabIndex), line.slice(tabIndex + 1));
    }
    return terminals;
  }

  // Focus the terminal whose current title matches. Returns the terminal's id,
  // or undefined when no title matches.
  private async focusTerminalByName(name: string): Promise<string | undefined> {
    const script = `
      on run argv
        set targetName to item 1 of argv
        tell application "Ghostty"
          repeat with w in windows
            repeat with t in tabs of w
              repeat with s in terminals of t
                if name of s is targetName then
                  focus s
                  activate
                  return id of s
                end if
              end repeat
            end repeat
          end repeat
        end tell
        return ""
      end run
    `;
    const { stdout } = await execFileAsync("osascript", ["-e", script, name]);
    const id = stdout.trim();
    return id || undefined;
  }
}
