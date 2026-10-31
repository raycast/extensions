import { accessSync, constants, readdirSync } from "node:fs";
import { join } from "node:path";

export function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** BoltAI*.app bundles in a folder, BoltAI.app first; a renamed app (Setapp's "BoltAI 2.app") counts too. */
function boltAIApps(folder: string): string[] {
  try {
    return readdirSync(folder)
      .filter((name) => name.startsWith("BoltAI") && name.endsWith(".app"))
      .sort((a, b) => (a === "BoltAI.app" ? -1 : b === "BoltAI.app" ? 1 : a.localeCompare(b)))
      .map((name) => join(folder, name, "Contents/Helpers/bolt"));
  } catch {
    return [];
  }
}

/**
 * Where `bolt` usually is: the ~/.local/bin link, then inside any BoltAI*.app in Applications,
 * ~/Applications or Setapp. Apps from before 3.0 have no bolt and are skipped.
 */
export function findBolt(home: string): string | undefined {
  const candidates = [
    join(home, ".local/bin/bolt"),
    ...boltAIApps("/Applications"),
    ...boltAIApps(join(home, "Applications")),
    ...boltAIApps("/Applications/Setapp"),
  ];
  return candidates.find(isExecutable);
}
