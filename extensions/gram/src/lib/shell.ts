import { execFile, execFileSync } from "node:child_process";
import { userInfo } from "node:os";
import path from "node:path";
import util from "node:util";

export const execFilePromise = util.promisify(execFile);

export function shellEscape(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

const POSIX_SHELL_NAMES = new Set(["sh", "bash", "zsh", "dash", "ksh", "ash", "mksh"]);

/**
 * Returns true when the given shell path's basename is a known POSIX shell
 * whose `-lc` invocation accepts the POSIX-style command produced by
 * `shellEscape`.
 */
export function isPosixShell(shellPath: string): boolean {
  if (!shellPath) {
    return false;
  }
  return POSIX_SHELL_NAMES.has(path.basename(shellPath));
}

/**
 * Gets the user's default shell from the system.
 * Uses dscl (Directory Service) on macOS to read the UserShell attribute.
 * Falls back to /bin/zsh if unable to determine.
 */
function getUserShell(): string {
  try {
    const username = userInfo().username;
    const result = execFileSync("dscl", [".", "-read", `/Users/${username}`, "UserShell"], {
      encoding: "utf8",
    });
    // Output format: "UserShell: /path/to/shell"
    const match = result.match(/UserShell:\s*(.+)/);
    if (match?.[1]) {
      return match[1].trim();
    }
  } catch {
    // Fall through to default
  }
  return "/bin/zsh";
}

/**
 * Executes a command in an isolated environment using `env -i` and a login shell
 * to prevent child processes from inheriting Raycast's environment variables.
 *
 * The approach:
 * 1. `env -i` clears inherited environment variables (including standard PATH).
 * 2. HOME and USER are passed into the process environment.
 * 3. A POSIX-compatible shell executes with `-lc` (non-interactive login shell).
 *
 * Note: `-lc` only sources login profiles (e.g. `~/.zprofile`, `~/.bash_profile`).
 * Interactive configurations like `~/.zshrc` are not loaded.
 */
export async function execWithCleanEnv(command: string, args: string[]): Promise<void> {
  const userShell = getUserShell();

  // Non-POSIX shells (fish, nushell, elvish, xonsh, pwsh, ...) don't accept
  // the POSIX-style quoted command syntax built below, so fall back to /bin/zsh.
  // Note: Falling back to /bin/zsh will not load config files from non-POSIX shells (e.g. config.fish).
  const posixShell = isPosixShell(userShell) ? userShell : "/bin/zsh";

  const escapedArgs = args.map(shellEscape).join(" ");
  const shellCommand = `${shellEscape(command)} ${escapedArgs}`;

  // `env -i` starts with an empty environment.
  // -l = login shell (sources login profiles like .zprofile), -c = execute command string
  const user = userInfo();

  await execFilePromise("env", [
    "-i",
    `HOME=${process.env.HOME || user.homedir}`,
    `USER=${process.env.USER || user.username}`,
    posixShell,
    "-lc",
    shellCommand,
  ]);
}
