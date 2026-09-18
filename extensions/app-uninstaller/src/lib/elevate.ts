import { mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
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
 *
 * The first argument is the destination, which the caller has already created
 * and which is empty. Moving into a fresh directory is what makes `mv -f` safe:
 * with a shared destination it would silently overwrite a same-named item that
 * was already in the Trash.
 */
const MOVE_TO_TRASH_AS_ADMIN = [
  "on run argv",
  "set destination to item 1 of argv",
  'set cmd to "/bin/mv -f --"',
  "repeat with i from 2 to count of argv",
  'set cmd to cmd & " " & quoted form of (item i of argv)',
  "end repeat",
  'set cmd to cmd & " " & quoted form of destination',
  "do shell script cmd with administrator privileges",
  "end run",
];

/**
 * A new, empty folder in the Trash for this uninstall.
 *
 * Created as the user before anything escalates, so the folder stays user-owned
 * and the Trash can be emptied without a further prompt. Being new, it cannot
 * collide with anything already in there, and it keeps one uninstall's files
 * together if they need to be put back.
 */
function createTrashFolder(label: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace("T", " ").replaceAll(":", ".");
  const target = join(homedir(), ".Trash", `${label} ${stamp}`);
  mkdirSync(target, { recursive: true });
  return target;
}

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
export async function trashAsAdmin(paths: string[], label = "Uninstalled"): Promise<void> {
  if (paths.length === 0) return;

  // Throws UnsafePathError, which callers surface as-is.
  for (const path of paths) checkRemovable(path);

  const destination = createTrashFolder(label);
  const script = MOVE_TO_TRASH_AS_ADMIN.flatMap((line) => ["-e", line]);

  try {
    await exec("/usr/bin/osascript", [...script, "--", destination, ...paths], 180_000);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/-128|User cancell?ed/i.test(message)) throw new AuthorizationCancelled();
    throw new Error(message.trim() || "The privileged move failed.");
  }
}
