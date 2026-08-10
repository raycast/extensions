import { execSync } from "child_process";
import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function shellQuote(str: string): string {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

type TerminalId = "iterm2" | "terminal" | "warp" | "ghostty" | "kitty";

const terminalProcessNames: Record<TerminalId, string[]> = {
  iterm2: ["iTerm2"],
  kitty: ["kitty"],
  warp: ["Warp"],
  ghostty: ["Ghostty", "ghostty"],
  terminal: ["Terminal"],
};

const terminalPriority: TerminalId[] = ["iterm2", "kitty", "warp", "ghostty", "terminal"];

function detectTerminal(): TerminalId {
  try {
    const output = execSync("ps -eo comm= | sort -u", { encoding: "utf-8" });
    const running = new Set(output.split("\n").map((l) => l.trim().split("/").pop() ?? ""));

    for (const id of terminalPriority) {
      if (terminalProcessNames[id].some((name) => running.has(name))) {
        return id;
      }
    }
  } catch {
    // fallback
  }
  return "terminal";
}

function getTerminal(): TerminalId {
  const prefs = getPreferenceValues<Preferences>();
  const pref = prefs.terminal as string | undefined;
  if (pref && pref !== "auto" && pref in terminalProcessNames) return pref as TerminalId;
  return detectTerminal();
}

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
      repeat with w in (every window)
        tell w
          repeat with i from 1 to (count of tabs)
            tell tab i
              tell current session
                if tty is "${esc(tty)}" then
                  tell w
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
      end repeat
    end tell
    return "not_found"
  `);
  return result.trim() === "found";
}

async function openInITerm(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "iTerm2"
      activate
      if (count of windows) = 0 then
        create window with default profile
      end if
      tell current window
        create tab with default profile
        tell current session
          write text "cd ${esc(shellQuote(directory))} && ${esc(command)}"
        end tell
      end tell
    end tell
  `);
}

async function openInTerminalApp(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "Terminal"
      activate
      do script "cd ${esc(shellQuote(directory))} && ${esc(command)}"
    end tell
  `);
}

async function openInWarp(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "Warp"
      activate
    end tell
    delay 0.3
    tell application "System Events"
      tell process "Warp"
        keystroke "t" using command down
        delay 0.3
        keystroke "cd ${esc(shellQuote(directory))} && ${esc(command)}"
        key code 36
      end tell
    end tell
  `);
}

async function openInGhostty(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "Ghostty"
      activate
    end tell
    delay 0.3
    tell application "System Events"
      tell process "Ghostty"
        keystroke "t" using command down
        delay 0.3
        keystroke "cd ${esc(shellQuote(directory))} && ${esc(command)}"
        key code 36
      end tell
    end tell
  `);
}

async function focusKittyByTty(tty: string): Promise<boolean> {
  try {
    const output = execSync("kitty @ ls 2>/dev/null", { encoding: "utf-8" });
    const windows = JSON.parse(output) as Array<{
      id: number;
      tabs: Array<{
        id: number;
        windows: Array<{ id: number; foreground_processes: Array<{ pid: number; cwd: string; cmdline: string[] }> }>;
      }>;
    }>;
    for (const win of windows) {
      for (const tab of win.tabs) {
        for (const pane of tab.windows) {
          for (const proc of pane.foreground_processes) {
            try {
              const procTty = execSync(`ps -o tty= -p ${proc.pid}`, { encoding: "utf-8" }).trim();
              if (tty === `/dev/tty${procTty}`) {
                execSync(`kitty @ focus-window --match id:${pane.id} 2>/dev/null`);
                return true;
              }
            } catch {
              // Process may have exited
            }
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function openInKitty(directory: string, command: string): Promise<void> {
  try {
    execSync(
      `kitty @ launch --type=tab --cwd=${shellQuote(directory)} -- sh -c ${shellQuote(`${command}; exec $SHELL`)}`,
      { encoding: "utf-8" },
    );
  } catch {
    await runAppleScript(`
      tell application "kitty"
        activate
      end tell
      delay 0.3
      tell application "System Events"
        tell process "kitty"
          keystroke "t" using command down
          delay 0.3
          keystroke "cd ${esc(shellQuote(directory))} && ${esc(command)}"
          key code 36
        end tell
      end tell
    `);
  }
}

const openers: Record<TerminalId, (dir: string, cmd: string) => Promise<void>> = {
  iterm2: openInITerm,
  terminal: openInTerminalApp,
  warp: openInWarp,
  ghostty: openInGhostty,
  kitty: openInKitty,
};

export async function openOpenCode(directory: string, prompt?: string): Promise<void> {
  const terminal = getTerminal();
  const cmd = prompt ? `opencode --prompt ${shellQuote(prompt)}` : "opencode";
  return openers[terminal](directory, cmd);
}

export async function resumeSession(directory: string, sessionId: string, isOpen: boolean = false): Promise<void> {
  const cmd = `opencode -s ${shellQuote(sessionId)}`;
  const terminal = getTerminal();

  if (isOpen) {
    const tty = findTtyForSession(sessionId);
    if (tty) {
      let focused = false;
      if (terminal === "iterm2") focused = await focusITermByTty(tty);
      if (terminal === "kitty") focused = await focusKittyByTty(tty);
      if (focused) return;
    }
  }

  return openers[terminal](directory, cmd);
}
