import { LocalStorage } from "@raycast/api";
import { stat } from "node:fs/promises";
import { normalizeIndexRoots } from "./index-root-paths";

export { normalizeIndexRoots } from "./index-root-paths";

const ROOTS_KEY = "configured-index-roots-v1";

/**
 * Reading the configured roots does NOT scan any directory and never runs fd.
 * A saved selection wins; old pre-setup indexes remain backward compatible
 * using their embedded roots until users explicitly change folders.
 */
export async function getConfiguredIndexRoots(
  previousRoots: string[] = [],
): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(ROOTS_KEY);
  if (stored !== undefined) {
    try {
      const parsed: unknown = JSON.parse(stored);
      if (
        Array.isArray(parsed) &&
        parsed.every((entry) => typeof entry === "string")
      ) {
        return normalizeIndexRoots(parsed);
      }
    } catch {
      // Invalid stored configuration is treated as unconfigured.
    }
    return [];
  }
  return normalizeIndexRoots(previousRoots);
}

/** Persist only an explicit folder selection, never start an index build. */
export async function saveConfiguredIndexRoots(
  folders: string[],
): Promise<string[]> {
  const roots = normalizeIndexRoots(folders);
  if (!roots.length) throw new Error("Choose at least one folder to index.");
  for (const root of roots) {
    const info = await stat(root);
    if (!info.isDirectory()) throw new Error("Not a directory: " + root);
  }
  await LocalStorage.setItem(ROOTS_KEY, JSON.stringify(roots));
  return roots;
}
