import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

/**
 * Resolves executables only from the scan's extraPath so provider tests never pick up tools installed on the host.
 */
export async function resolveFromExtraPath(
  name: string,
  options: { extraPath?: string } = {},
): Promise<string | undefined> {
  for (const directory of options.extraPath?.split(path.delimiter).filter(Boolean) ?? []) {
    const candidate = path.join(directory, name);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
}
