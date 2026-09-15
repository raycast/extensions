import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const RELEASES_URL = "https://github.com/myksyut/super-todo/releases";

export class CompanionNotFoundError extends Error {
  constructor() {
    super(
      "Install super todo.app from the project releases, then select it in Companion App preferences. The preview is not notarized; review the installation notes first.",
    );
    this.name = "CompanionNotFoundError";
  }
}

/** An explicit selection never silently falls back to another app. */
export async function findCompanion(
  selectedPath?: string,
  home = homedir(),
  applications = "/Applications",
): Promise<{ app: string; executable: string }> {
  const candidates = selectedPath
    ? [selectedPath]
    : [
        path.join(home, "Applications", "super todo.app"),
        path.join(applications, "super todo.app"),
      ];
  for (const app of candidates) {
    const executable = path.join(app, "Contents", "MacOS", "super-todo");
    try {
      await access(executable, constants.X_OK);
      return { app, executable };
    } catch {
      // Try the other standard installation location, but do not download anything.
    }
  }
  throw new CompanionNotFoundError();
}
