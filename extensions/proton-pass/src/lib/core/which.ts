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
    try {
      if (!statSync(candidate).isFile()) continue;
      // Execute bits for its owner or group only don't make it runnable by this user.
      accessSync(candidate, constants.X_OK);
      found.push(candidate);
    } catch {
      // Missing, or not runnable by this user.
    }
  }
  return found;
}
