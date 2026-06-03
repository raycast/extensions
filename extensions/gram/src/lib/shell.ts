import { execFile } from "child_process";
import { execFileSync } from "node:child_process";
import { homedir, userInfo } from "node:os";
import * as util from "util";

export const execFilePromise = util.promisify(execFile);

export function shellEscape(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Gets the user's default shell from the system.
 * Uses dscl (Directory Service) on macOS to read the UserShell attribute.
 * Falls back to /bin/zsh if unable to determine.
 */
function getUserShell(): string {
  try {
    const username = process.env.USER || userInfo().username;
    const result = execFileSync("dscl", [".", "-read", `/Users/${username}`, "UserShell"], {
      encoding: "utf8",
    });
    // Output format: "UserShell: /path/to/shell"
    const match = result.match(/UserShell:\s*(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch {
    // Fall through to default
  }
  return "/bin/zsh";
}

/**
 * Executes a command with a clean environment using `env -i` and a login shell.
 * This ensures child processes don't inherit Raycast's environment variables.
 *
 * The approach:
 * 1. `env -i` starts with an empty environment
 * 2. Only HOME is passed (required for login shell to find profile files)
 * 3. A POSIX-compatible login shell (zsh or bash) sources the user's profile,
 *    then execs the target command directly — avoiding shell-escaping issues
 *    with non-POSIX shells like fish.
 *
 * This gives the command the same environment as a fresh terminal window.
 */
export async function execWithCleanEnv(command: string, args: string[]): Promise<void> {
  const userShell = getUserShell();

  // If the user's shell is fish (or any other non-POSIX shell), fall back to
  // /bin/zsh for the -lc invocation. Fish does not support POSIX-style quoting
  // or the `-c` flag in the same way, so we must use a POSIX shell to source
  // the profile and then exec the real command.
  const isFish = userShell.endsWith("fish");
  const posixShell = isFish ? "/bin/zsh" : userShell;

  const escapedArgs = args.map(shellEscape).join(" ");
  const shellCommand = `${shellEscape(command)} ${escapedArgs}`;

  // Use env -i to start with empty environment, then login shell for user's profile
  // -l = login shell (sources profile), -c = execute command
  await execFilePromise("env", ["-i", `HOME=${process.env.HOME || homedir()}`, posixShell, "-lc", shellCommand]);
}
