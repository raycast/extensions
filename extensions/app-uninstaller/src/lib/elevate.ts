import { exec } from "./exec";
import { checkRemovable } from "./safety";

/**
 * AppleScript that moves its arguments to the Trash as root.
 *
 * No path is ever interpolated into this script. The paths arrive as `argv` and
 * are quoted by AppleScript's `quoted form of`, so a file name containing
 * spaces, quotes, `$(…)` or `;` is passed to `mv` as one literal argument and
 * can never be read as shell syntax. `--` stops `mv` from treating a name that
 * begins with a dash as an option.
 *
 * `do shell script … with administrator privileges` is the system's own
 * authorization flow: macOS presents the password dialog itself, and the
 * extension never sees or handles the credential.
 */
const MOVE_TO_TRASH_AS_ADMIN = [
  "on run argv",
  "set trashPath to POSIX path of (path to trash folder)",
  'set cmd to "/bin/mv -f --"',
  "repeat with p in argv",
  'set cmd to cmd & " " & quoted form of (contents of p)',
  "end repeat",
  'set cmd to cmd & " " & quoted form of trashPath',
  "do shell script cmd with administrator privileges",
  "end run",
];

/** The user dismissed the macOS authentication dialog. Not an error worth shouting about. */
export class AuthorizationCancelled extends Error {
  constructor() {
    super("Authentication was cancelled");
    this.name = "AuthorizationCancelled";
  }
}

/**
 * Move `paths` to the Trash with administrator rights.
 *
 * Every path is validated one final time here. Root ignores the file permissions
 * that would otherwise stop a mistake, so the allow-list in `safety.ts` is the
 * only thing standing between a bad path and a bad outcome — and the whole batch
 * is refused if any single path fails, rather than partially applied.
 */
export async function trashAsAdmin(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  // Throws UnsafePathError, which callers surface as-is.
  for (const path of paths) checkRemovable(path);

  const script = MOVE_TO_TRASH_AS_ADMIN.flatMap((line) => ["-e", line]);

  try {
    await exec("/usr/bin/osascript", [...script, "--", ...paths], 180_000);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/-128|User cancell?ed/i.test(message)) throw new AuthorizationCancelled();
    throw new Error(message.trim() || "The privileged move failed.");
  }
}
