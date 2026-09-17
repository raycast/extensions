import { execFile, execFileSync } from "child_process";
import { writeFileSync } from "fs";
import { promisify } from "util";
import os from "os";
import path from "path";
import { nvimPath, terminalApp } from "./preferences";
import { trackRecentDir } from "./sessions";

const execFileAsync = promisify(execFile);

/** Escape and wrap a string for safe use in a shell context. */
function shellEscape(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/** Escape a string for use inside AppleScript double-quoted string: " and \ → escaped. Control chars are spliced out via AppleScript constants so literal line breaks never enter the source. */
function applescriptEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\t/g, '" & tab & "')
    .replace(/\r/g, '" & return & "')
    .replace(/\n/g, '" & linefeed & "');
}

export function findNvimPath(): string {
  if (nvimPath && nvimPath !== "nvim") return nvimPath;

  const candidates = ["/opt/homebrew/bin/nvim", "/usr/local/bin/nvim", "/usr/bin/nvim"];

  for (const p of candidates) {
    try {
      execFileSync("test", ["-x", p]);
      return p;
    } catch {
      // not found, try next
    }
  }

  return "nvim";
}

function buildStrategies(
  nvimBin: string,
  args: string[],
  dir: string,
  cmd: string,
  shellCmd: string,
): Array<() => Promise<void>> {
  const allStrategies: Record<string, () => Promise<void>> = {
    iTerm2: async () => {
      const script = `
        tell application "iTerm2"
          activate
          set newWindow to (create window with default profile)
          tell current session of newWindow
            write text "${applescriptEscape(shellCmd)}"
          end tell
        end tell
      `;
      await execFileAsync("osascript", ["-e", script], { timeout: 10000 });
    },
    Ghostty: async () => {
      const suffix = Math.random().toString(36).slice(2, 8);
      const scriptPath = path.join(os.tmpdir(), `neovim-ghostty-${process.pid}-${suffix}.sh`);
      writeFileSync(scriptPath, `#!/bin/sh\ncd ${shellEscape(dir)} && ${cmd}\n`, { mode: 0o755 });
      await execFileAsync("open", ["-na", "Ghostty.app", "--args", "-e", scriptPath], {
        timeout: 10000,
      });
    },
    kitty: async () => {
      await execFileAsync("kitty", ["--directory", dir, nvimBin, ...args], { timeout: 10000 });
    },
    Alacritty: async () => {
      await execFileAsync("alacritty", ["--working-directory", dir, "-e", nvimBin, ...args], {
        timeout: 10000,
      });
    },
    WezTerm: async () => {
      await execFileAsync("wezterm", ["start", "--cwd", dir, "--", "sh", "-c", cmd], {
        timeout: 10000,
      });
    },
    Terminal: async () => {
      const suffix = Math.random().toString(36).slice(2, 8);
      const scriptPath = path.join(os.tmpdir(), `neovim-terminal-${process.pid}-${suffix}.sh`);
      writeFileSync(scriptPath, `#!/bin/sh\ncd ${shellEscape(dir)} && ${cmd}; exit\n`, { mode: 0o755 });
      await execFileAsync("open", ["-a", "Terminal", scriptPath], { timeout: 10000 });
    },
  };

  if (terminalApp && terminalApp !== "auto" && allStrategies[terminalApp]) {
    return [allStrategies[terminalApp]];
  }

  return Object.values(allStrategies);
}

function openInTerminal(nvimBin: string, args: string[], workingDir?: string): Promise<void> {
  const dir = workingDir || os.homedir();
  const cmd = args.length > 0 ? `${shellEscape(nvimBin)} ${args.map(shellEscape).join(" ")}` : shellEscape(nvimBin);
  const shellCmd = `cd ${shellEscape(dir)} && ${cmd}`;
  const strategies = buildStrategies(nvimBin, args, dir, cmd, shellCmd);
  return tryStrategies(strategies);
}

async function tryStrategies(strategies: Array<() => Promise<void>>): Promise<void> {
  const errors: string[] = [];
  for (let i = 0; i < strategies.length; i++) {
    try {
      await strategies[i]();
      return;
    } catch (err) {
      errors.push(`Strategy ${i}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`Could not open Neovim in any terminal. Errors:\n${errors.join("\n")}`);
}

export async function openInNvim(targets: string[]): Promise<void> {
  if (targets.length === 0) return;

  trackRecentDir(targets[0]);

  const nvimBin = findNvimPath();
  const firstTarget = targets[0];

  let dir: string;
  try {
    const fileType = execFileSync("stat", ["-f", "%Sp", firstTarget], { encoding: "utf-8" }).trim();
    dir = fileType.startsWith("d") ? firstTarget : path.dirname(firstTarget);
  } catch {
    // stat failed (file may not exist), assume it's a file and use parent dir
    dir = path.dirname(firstTarget);
  }

  await openInTerminal(nvimBin, targets, dir);
}

export async function openNewWindow(): Promise<void> {
  const nvimBin = findNvimPath();
  await openInTerminal(nvimBin, [], os.homedir());
}
