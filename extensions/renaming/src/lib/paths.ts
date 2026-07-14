/**
 * Shared path helpers for rename operations.
 */

import { realpath } from "fs/promises";
import { dirname, resolve } from "path";

/**
 * Validate that a new path stays within the expected directory (prevents path traversal).
 * Resolves symlinks so a symlinked parent can't bypass the check.
 */
export async function validatePathTraversal(oldPath: string, newPath: string): Promise<string | null> {
  try {
    const oldDir = normalizePath(await realpath(dirname(oldPath)));
    const newDir = normalizePath(await realpath(dirname(newPath)));

    if (oldDir !== newDir) {
      return "Path traversal detected: new filename would move file to different directory";
    }
  } catch {
    // If realpath fails (e.g. broken symlink), fall back to resolve()
    const oldDir = normalizePath(resolve(dirname(oldPath)));
    const newDir = normalizePath(resolve(dirname(newPath)));

    if (oldDir !== newDir) {
      return "Path traversal detected: new filename would move file to different directory";
    }
  }

  return null;
}

/**
 * Normalize a path for case-insensitive comparison (macOS uses case-insensitive FS by default)
 */
export function normalizePath(filePath: string): string {
  return process.platform === "darwin" || process.platform === "win32" ? filePath.toLowerCase() : filePath;
}

/**
 * Check if two paths refer to the same file on the current filesystem
 */
export function isSamePath(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}
