import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { StatusJSON, groupsFromPresentation } from "./mint-model";

/**
 * The four groups of the last Scan, from the file Mint saves after it
 * (disk-presentation-v1.json): the bytes the menu bar's Disk ring draws.
 */
export function savedGroups(): StatusJSON["groups"] | undefined {
  try {
    const file = join(homedir(), "Library", "Application Support", "Mint", "disk-presentation-v1.json");
    return groupsFromPresentation(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return undefined;
  }
}

/**
 * How many loose files each organized folder would sort, as the menu bar's
 * dropdown last measured it (organize-folder-progress.json): shown at once,
 * then replaced by a fresh preview.
 */
export function savedFolderProgress(): Record<string, number> {
  try {
    const file = join(homedir(), "Library", "Application Support", "Mint", "organize-folder-progress.json");
    const saved = JSON.parse(readFileSync(file, "utf8")) as Record<string, { total?: number; inPlace?: number }>;
    return Object.fromEntries(
      Object.entries(saved)
        .filter(([, value]) => typeof value.total === "number" && typeof value.inPlace === "number")
        .map(([path, value]) => [path, Math.max(0, (value.total ?? 0) - (value.inPlace ?? 0))]),
    );
  } catch {
    return {};
  }
}

/**
 * Where Mint has found copies on this Mac before, from its last Optimizable
 * scan (clone-dedupe-scan.json): the sources Optimize Storage lists while it
 * looks again.
 */
export function savedSourceKeys(): string[] {
  try {
    const file = join(homedir(), "Library", "Application Support", "Mint", "clone-dedupe-scan.json");
    const saved = JSON.parse(readFileSync(file, "utf8")) as { given?: Record<string, unknown> };
    return Object.keys(saved.given ?? {});
  } catch {
    return [];
  }
}
