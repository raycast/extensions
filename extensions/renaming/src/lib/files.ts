/**
 * Shared file utilities for rename operations
 */

import { rename, stat, access, readdir } from "fs/promises";
import { randomUUID } from "crypto";
import { constants } from "fs";
import path, { basename, dirname, extname, join, resolve } from "path";
import type { FileInfo, RenameOperation, RenameResult } from "../types";
import { validateFilename } from "./validation";
import { MAX_UNIQUE_FILENAME_ATTEMPTS } from "./constants";
import { getUserFriendlyErrorMessage } from "./errors";
import { log } from "./logger";

/**
 * Validate that a new path stays within the expected directory (prevents path traversal)
 */
function validatePathTraversal(oldPath: string, newPath: string): string | null {
  const oldDir = resolve(dirname(oldPath));
  const newDir = resolve(dirname(newPath));

  if (oldDir !== newDir) {
    return "Path traversal detected: new filename would move file to different directory";
  }

  return null;
}

/**
 * Get detailed file info
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
  const stats = await stat(filePath);
  const isDirectory = stats.isDirectory();
  const fullName = basename(filePath);
  const ext = isDirectory ? "" : extname(filePath);
  // Dotfiles like .gitignore: extname returns ".gitignore" (the whole name), baseName would be ""
  const isDotfile = !isDirectory && fullName.startsWith(".") && ext === fullName;
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
 * Check if a file exists at the given path
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a path for case-insensitive comparison (macOS uses case-insensitive FS by default)
 */
function normalizePath(filePath: string): string {
  return process.platform === "darwin" || process.platform === "win32" ? filePath.toLowerCase() : filePath;
}

/**
 * Check if two paths refer to the same file on the current filesystem
 */
function isSamePath(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}

/**
 * Check for conflicts in a batch of rename operations.
 * Recognizes within-batch moves: if a target is occupied by another
 * source that's being moved away, it's not a real conflict.
 */
export async function checkConflicts(operations: RenameOperation[]): Promise<string[]> {
  const conflicts: string[] = [];
  const targetPaths = new Set<string>();

  // Build set of source paths that are being moved to a different name
  const sourcesBeingMoved = new Set<string>();
  for (const op of operations) {
    if (!isSamePath(op.oldPath, op.newPath)) {
      sourcesBeingMoved.add(normalizePath(op.oldPath));
    }
  }

  for (const op of operations) {
    // Check for path traversal attempts
    const traversalError = validatePathTraversal(op.oldPath, op.newPath);
    if (traversalError) {
      conflicts.push(`"${basename(op.oldPath)}": ${traversalError}`);
      continue;
    }

    // Check for duplicate targets within the batch (case-insensitive on macOS)
    const normalizedNewPath = normalizePath(op.newPath);
    if (targetPaths.has(normalizedNewPath)) {
      conflicts.push(`Multiple files would be renamed to "${basename(op.newPath)}"`);
    }
    targetPaths.add(normalizedNewPath);

    // Check if target already exists (and isn't the source file itself)
    if (!isSamePath(op.oldPath, op.newPath) && (await fileExists(op.newPath))) {
      // Not a conflict if the file at the target is itself being moved away in this batch
      if (!sourcesBeingMoved.has(normalizedNewPath)) {
        conflicts.push(`"${basename(op.newPath)}" already exists`);
      }
    }
  }

  return conflicts;
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
  const traversalError = validatePathTraversal(oldPath, newPath);
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

  // Check if target already exists (safety check)
  // Use case-insensitive comparison on macOS (case-insensitive FS)
  if (!isSamePath(oldPath, newPath) && (await fileExists(newPath))) {
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

/**
 * Batch rename files with progress callback.
 *
 * Handles two tricky cases:
 * 1. Nested directories: sorts deepest-first so children are renamed before parents.
 * 2. Within-batch conflicts: when an operation's target is another operation's source
 *    (e.g., file-5→file-4, file-6→file-5, ...), uses a two-phase approach —
 *    first moves blocking sources to temp names, then executes the final renames.
 *
 * Results are returned in the original input order.
 */
export async function batchRename(
  operations: RenameOperation[],
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<RenameResult[]> {
  const results: RenameResult[] = new Array(operations.length);

  // --- Phase 0: Detect within-batch conflicts ---
  // A source is "blocking" if another operation wants to write to its path.
  const sourceToIndex = new Map<string, number>();
  for (let i = 0; i < operations.length; i++) {
    sourceToIndex.set(normalizePath(operations[i]!.oldPath), i);
  }

  const needsTemp = new Set<number>();
  for (const op of operations) {
    if (isSamePath(op.oldPath, op.newPath)) continue;
    const blockingIdx = sourceToIndex.get(normalizePath(op.newPath));
    if (blockingIdx !== undefined && !isSamePath(operations[blockingIdx]!.oldPath, op.oldPath)) {
      // The file at our target is also a source being moved — it needs to go to temp first
      needsTemp.add(blockingIdx);
    }
  }

  // --- Phase 1: Move blocking sources to temp names ---
  const tempMap = new Map<number, string>(); // operation index → temp path
  if (needsTemp.size > 0) {
    for (const idx of needsTemp) {
      const op = operations[idx]!;
      const dir = dirname(op.oldPath);
      const tempName = `.tmp_rename_${randomUUID().slice(0, 8)}_${basename(op.oldPath)}`;
      const tempPath = join(dir, tempName);

      try {
        await rename(op.oldPath, tempPath);
        tempMap.set(idx, tempPath);
      } catch (error) {
        log.files.error("Temp rename failed", { oldPath: op.oldPath, tempPath, error });
        results[idx] = {
          oldPath: op.oldPath,
          newPath: op.newPath,
          success: false,
          error: `Failed to prepare rename: ${getUserFriendlyErrorMessage(error)}`,
        };
      }
    }
  }

  // --- Phase 2: Execute all renames ---
  // Build adjusted operations (use temp path as source where applicable)
  const adjustedOps = operations.map((op, i) => {
    const tempPath = tempMap.get(i);
    if (tempPath) {
      return { ...op, oldPath: tempPath };
    }
    return op;
  });

  // Sort by path depth descending so children are renamed before parents
  const indexed = adjustedOps
    .map((op, i) => ({ op, originalIndex: i }))
    .filter(({ originalIndex }) => !results[originalIndex]); // skip already-failed
  indexed.sort(
    (a, b) => path.normalize(b.op.oldPath).split(path.sep).length - path.normalize(a.op.oldPath).split(path.sep).length,
  );

  for (let i = 0; i < indexed.length; i++) {
    const { op, originalIndex } = indexed[i]!;

    if (onProgress) {
      onProgress(i + 1, operations.length, basename(operations[originalIndex]!.oldPath));
    }

    const result = await renameFile(op.oldPath, op.newName);
    // Store with original oldPath so undo history is correct
    results[originalIndex] = {
      ...result,
      oldPath: operations[originalIndex]!.oldPath,
    };

    // After a successful directory rename, fix up the newPath of
    // already-processed child results so undo history stays correct
    if (result.success && op.oldPath !== result.newPath) {
      const oldPrefix = op.oldPath + path.sep;
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r && r.success && r.newPath.startsWith(oldPrefix)) {
          results[j] = { ...r, newPath: result.newPath + r.newPath.slice(op.oldPath.length) };
        }
      }
    }
  }

  // --- Phase 3: Cleanup failed temp renames ---
  // If a file was moved to temp but its final rename failed, restore it
  for (const [idx, tempPath] of tempMap) {
    if (results[idx] && !results[idx]!.success) {
      try {
        const originalPath = operations[idx]!.oldPath;
        await rename(tempPath, originalPath);
        log.files.info("Restored temp file", { tempPath, originalPath });
      } catch {
        log.files.error("Could not restore temp file", { tempPath });
      }
    }
  }

  return results;
}

/**
 * Scan a directory for files (non-directory entries) at the top level only.
 * Skips hidden files (starting with '.') and subdirectories.
 */
export async function scanDirectoryForFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) continue;

    filePaths.push(join(dirPath, entry.name));
  }

  return filePaths;
}

/**
 * Recursively scan a directory for files, walking all subdirectories.
 * Skips hidden files and hidden directories (starting with '.').
 */
export async function scanDirectoryRecursive(dirPath: string): Promise<string[]> {
  const filePaths: string[] = [];
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const nested = await scanDirectoryRecursive(fullPath);
      filePaths.push(...nested);
    } else {
      filePaths.push(fullPath);
    }
  }

  return filePaths;
}

/**
 * Deduplicate file paths (case-insensitive on macOS)
 */
export function deduplicatePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  return paths.filter((p) => {
    const key = normalizePath(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Generate a unique filename by appending a number if conflict exists
 * e.g., "file.txt" -> "file (1).txt" -> "file (2).txt"
 */
export async function generateUniqueFilename(dir: string, baseName: string, extension: string): Promise<string> {
  let candidate = extension ? `${baseName}${extension}` : baseName;
  let counter = 1;

  while (await fileExists(join(dir, candidate))) {
    candidate = extension ? `${baseName} (${counter})${extension}` : `${baseName} (${counter})`;
    counter++;

    // Safety limit to prevent infinite loops
    if (counter > MAX_UNIQUE_FILENAME_ATTEMPTS) {
      throw new Error(`Could not generate unique filename after ${MAX_UNIQUE_FILENAME_ATTEMPTS} attempts`);
    }
  }

  return candidate;
}
