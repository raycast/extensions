import { existsSync } from "node:fs";
import { EnvScope, PathEntry } from "./types.js";

/**
 * Expand Windows-style %VARIABLE% references in a path string
 * using the current process environment.
 */
export function expandEnvVars(path: string): string {
  return path.replace(/%([^%]+)%/g, (_, varName: string) => {
    return process.env[varName] ?? `%${varName}%`;
  });
}

/**
 * Parse a PATH string into an array of PathEntry objects,
 * checking whether each expanded path exists on disk.
 */
export function parsePath(pathValue: string, scope: EnvScope): PathEntry[] {
  if (!pathValue) return [];

  return pathValue
    .split(";")
    .filter((p) => p.trim() !== "")
    .map((p, index) => {
      const expanded = expandEnvVars(p.trim());
      return {
        path: p.trim(),
        exists: existsSync(expanded),
        scope,
        index,
      };
    });
}

/**
 * Reconstruct a PATH string from an array of PathEntry objects.
 */
export function buildPath(entries: PathEntry[]): string {
  return entries.map((e) => e.path).join(";");
}

/**
 * Check if a path already exists in the entries list.
 * Comparison is case-insensitive and normalizes trailing slashes.
 */
export function isDuplicate(entries: PathEntry[], newPath: string): boolean {
  const normalize = (p: string) =>
    p
      .toLowerCase()
      .replace(/[\\/]+$/, "")
      .replace(/\\/g, "/");
  const normalizedNew = normalize(newPath);
  return entries.some((e) => normalize(e.path) === normalizedNew);
}

/**
 * Move a path entry up or down in the list and reindex.
 * Returns a new array with updated indices.
 */
export function movePathEntry(
  entries: PathEntry[],
  fromIndex: number,
  direction: "up" | "down",
): PathEntry[] {
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
  if (toIndex < 0 || toIndex >= entries.length) return entries;

  const result = [...entries];
  const temp = result[fromIndex];
  result[fromIndex] = result[toIndex];
  result[toIndex] = temp;

  return result.map((entry, i) => ({ ...entry, index: i }));
}
