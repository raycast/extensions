import { readlinkSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type ResolvedSymlink = {
  /** Raw target path as stored in the symlink (may be relative). */
  rawTarget: string;
  /** Fully-resolved absolute path. */
  resolvedPath: string;
  /** Whether the target actually exists on disk. */
  targetExists: boolean;
  /** Whether the target is a directory (`false` when target is missing). */
  targetIsDirectory: boolean;
};

/**
 * Resolve a symlink's target using `readlinkSync`.
 *
 * Returns `null` when the path cannot be read (not a symlink, permission
 * denied, etc.). For broken symlinks the returned object has
 * `targetExists === false`.
 */
export function resolveSymlink(symlinkPath: string): ResolvedSymlink | null {
  try {
    const rawTarget = readlinkSync(symlinkPath);
    const resolvedPath = resolve(dirname(symlinkPath), rawTarget);
    let targetExists = false;
    let targetIsDirectory = false;
    try {
      const stat = statSync(resolvedPath);
      targetExists = true;
      targetIsDirectory = stat.isDirectory();
    } catch {
      targetExists = false;
    }
    return { rawTarget, resolvedPath, targetExists, targetIsDirectory };
  } catch {
    return null;
  }
}
