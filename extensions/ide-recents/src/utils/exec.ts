import { execFile } from "child_process";
import { homedir } from "os";
import path from "path";
import type { OpenCommand } from "../providers/types";

/**
 * Raycast runs as a GUI process with a very short PATH (usually
 * /usr/bin:/bin:/usr/sbin:/sbin), so the common install locations are added
 * explicitly before looking for an IDE CLI.
 */
const EXTRA_SEARCH_PATHS = [
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  path.join(homedir(), ".local/bin"),
  path.join(homedir(), ".antigravity-ide/antigravity-ide/bin"),
  "/Applications/Visual Studio Code.app/Contents/Resources/app/bin",
  "/Applications/Trae.app/Contents/Resources/app/bin",
  "/Applications/Antigravity IDE.app/Contents/Resources/app/bin",
];

const EXEC_TIMEOUT_MS = 15000;
const EXEC_MAX_BUFFER = 4 * 1024 * 1024;

/** Environment used when running an IDE CLI */
export function buildExecEnv(): NodeJS.ProcessEnv {
  const currentPath = process.env.PATH ? process.env.PATH.split(":") : [];
  const pathEntries = Array.from(new Set([...EXTRA_SEARCH_PATHS, ...currentPath].filter(Boolean)));

  return {
    ...process.env,
    HOME: process.env.HOME || homedir(),
    PATH: pathEntries.join(":"),
  };
}

export interface CommandResult {
  success: boolean;
  error?: string;
}

/**
 * Run one open command.
 *
 * `execFile` is used instead of `exec`, so the executable and its arguments are
 * passed separately and no shell is involved. A project path that contains
 * spaces, quotes, `$()`, backticks or semicolons is therefore only ever treated
 * as an argument: it is neither interpreted nor mangled by escaping.
 */
export function runOpenCommand(command: OpenCommand): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      command.command,
      command.args,
      {
        env: buildExecEnv(),
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: EXEC_MAX_BUFFER,
      },
      (error, _stdout, stderr) => {
        if (!error) {
          resolve({ success: true });
          return;
        }
        resolve({
          success: false,
          error: stderr?.trim() || error.message,
        });
      },
    );
  });
}

/** Quote a single argument using POSIX rules */
function quoteForShell(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Render an open command as a string that can be pasted into a terminal.
 * Used for display and "Copy Terminal Command" only — never for execution.
 */
export function formatOpenCommand(command: OpenCommand): string {
  return [command.command, ...command.args].map(quoteForShell).join(" ");
}
