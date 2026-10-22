import * as fs from "node:fs/promises";
import path from "node:path";

/**
 * Canonicalize a path's parent directories without following the final component.
 * This makes paths comparable when a parent (e.g. an iCloud Documents folder) is a symlink,
 * while still allowing the final item itself to be missing or a symlink.
 */
export async function canonicalPath(pathname: string): Promise<string> {
  const resolved = path.resolve(pathname);
  try {
    return path.join(await fs.realpath(path.dirname(resolved)), path.basename(resolved));
  } catch {
    return resolved;
  }
}

/** Whether the symlink at `linkPath` points at `expected`, tolerating symlinked parent directories. */
export async function linkPointsTo(linkPath: string, expected: string): Promise<boolean> {
  const destination = path.resolve(path.dirname(linkPath), await fs.readlink(linkPath));
  if (destination === path.resolve(expected)) return true;
  const [left, right] = await Promise.all([canonicalPath(destination), canonicalPath(expected)]);
  return left === right;
}
