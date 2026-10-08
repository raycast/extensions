/**
 * Single-file operations: info, existence checks, renaming, unique name generation.
 */

import { rename, stat, lstat } from "fs/promises";
import { basename, dirname, extname, join } from "path";
import type { FileInfo, RenameResult } from "../types";
import { validateFilename } from "./validation";
import { getUserFriendlyErrorMessage } from "./errors";
import { log } from "./logger";
import { validatePathTraversal, isSameEntry } from "./paths";

/**
 * Get detailed file info
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
  const stats = await stat(filePath);
  const isDirectory = stats.isDirectory();
  const fullName = basename(filePath);
  const ext = isDirectory ? "" : extname(filePath);
  // Dotfiles like .gitignore: extname returns "" so the whole name is the baseName
  const isDotfile = !isDirectory && fullName.startsWith(".") && ext === "";
  const extension = isDotfile ? "" : ext;
  const baseName = isDirectory || isDotfile ? fullName : basename(filePath, extension);

  return {
    path: filePath,
    name: fullName,
    baseName,
    extension,
    isDirectory,
  };
}

/**
 * Check whether a directory entry exists at the given path.
 *
 * Uses `lstat` rather than `access`, for the same reason {@link isSameFile} does:
 * rename operates on the directory entry, so a symlink occupies its path even when
 * the target it points at is missing. `access` follows symlinks and would report a
 * dangling symlink as absent, letting fs.rename silently destroy it.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rename a single file using fs.rename (safe, no shell injection)
 * IMPORTANT: This will fail if target exists - use checkConflicts first
 */
export async function renameFile(oldPath: string, newName: string): Promise<RenameResult> {
  const dir = dirname(oldPath);
  const newPath = join(dir, newName);

  // Validate the new filename
  const validation = validateFilename(newName);
  if (!validation.valid) {
    return {
      oldPath,
      newPath,
      success: false,
      error: validation.error,
    };
  }

  // Validate path traversal (security check)
  const traversalError = await validatePathTraversal(oldPath, newPath);
  if (traversalError) {
    return {
      oldPath,
      newPath,
      success: false,
      error: traversalError,
    };
  }

  // Check if source still exists
  if (!(await fileExists(oldPath))) {
    log.files.warn("Source file missing", { oldPath });
    return {
      oldPath,
      newPath,
      success: false,
      error: "Source file no longer exists",
    };
  }

  // Check if target already exists (safety check).
  // The guard is skipped only when the destination is the very entry being renamed:
  // a case-only rename resolves to the source itself on a case-insensitive volume,
  // but on a case-sensitive volume it is a distinct existing file that fs.rename
  // would silently overwrite.
  if ((await fileExists(newPath)) && !(await isSameEntry(oldPath, newPath))) {
    log.files.warn("Target already exists", { oldPath, newPath, newName });
    return {
      oldPath,
      newPath,
      success: false,
      error: `Target "${newName}" already exists - would overwrite`,
    };
  }

  try {
    await rename(oldPath, newPath);
    return {
      oldPath,
      newPath,
      success: true,
    };
  } catch (error) {
    log.files.error("Rename failed", { oldPath, newPath, error });
    return {
      oldPath,
      newPath,
      success: false,
      error: getUserFriendlyErrorMessage(error),
    };
  }
}
