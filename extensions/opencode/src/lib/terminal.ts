import { execSync } from "child_process";
import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function shellQuote(str: string): string {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

function getTerminal(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.terminal ?? "iterm2";
}

// --- iTerm2 ---

function findTtyForSession(sessionId: string): string | null {
  try {
    const output = execSync("ps aux", { encoding: "utf-8" });
    for (const line of output.split("\n")) {
      if (!line.includes(sessionId)) continue;
      const parts = line.trim().split(/\s+/);
      const tty = parts[6];
      if (tty && tty.startsWith("s")) {
        return `/dev/tty${tty}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function focusITermByTty(tty: string): Promise<boolean> {
  const result = await runAppleScript(`
    tell application "iTerm2"
      tell current window
        repeat with i from 1 to (count of tabs)
          tell tab i
            tell current session
              if tty is "${esc(tty)}" then
                tell current window of application "iTerm2"
                  select tab i
                  if is hotkey window then
                    reveal hotkey window
                  end if
                end tell
                activate
                return "found"
              end if
            end tell
          end tell
        end repeat
      end tell
    end tell
    return "not_found"
  `);
  return result.trim() === "found";
}

async function openInITerm(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "iTerm2"
      activate
      tell current window
        create tab with default profile
        tell current session
          write text "cd ${shellQuote(directory)} && ${esc(command)}"
        end tell
      end tell
    end tell
  `);
}

// --- Terminal.app ---

async function openInTerminalApp(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "Terminal"
      activate
      do script "cd ${shellQuote(directory)} && ${esc(command)}"
    end tell
  `);
}

// --- Public API ---

export async function openOpenCode(directory: string): Promise<void> {
  if (getTerminal() === "iterm2") {
    return openInITerm(directory, "opencode");
  }
  return openInTerminalApp(directory, "opencode");
}

export async function resumeSession(directory: string, sessionId: string, isOpen: boolean = false): Promise<void> {
  const cmd = `opencode -s ${shellQuote(sessionId)}`;

  if (isOpen && getTerminal() === "iterm2") {
    const tty = findTtyForSession(sessionId);
    if (tty) {
      const focused = await focusITermByTty(tty);
      if (focused) return;
    }
  }

  if (getTerminal() === "iterm2") {
    return openInITerm(directory, cmd);
  }
  return openInTerminalApp(directory, cmd);
}
