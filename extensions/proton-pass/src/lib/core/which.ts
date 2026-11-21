import { accessSync, constants, statSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";

/**
 * The files named `command` that the user can run, in the order of the folders of `searchPath`, the order a terminal
 * tries them in. Folders given relative to the working directory are skipped.
 */
export function findExecutables(command: string, searchPath: string): string[] {
  const found: string[] = [];
  for (const folder of searchPath.split(delimiter)) {
    if (!folder || !isAbsolute(folder)) continue;
    const candidate = join(folder, command);
    if (found.includes(candidate)) continue;
    if (isRunnableFile(candidate)) found.push(candidate);
  }
  return found;
}

/** Whether `file` is a file this user can run, rather than a folder, a missing file or one they can't run. */
export function isRunnableFile(file: string): boolean {
  try {
    if (!statSync(file).isFile()) return false;
    // Execute bits for its owner or group only don't make it runnable by this user.
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
