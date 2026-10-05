/**
 * Batch rename orchestration and conflict detection.
 */

import { rename } from "fs/promises";
import { randomUUID } from "crypto";
import path, { basename, dirname, join } from "path";
import type { RenameOperation, RenameResult } from "../types";
import { getUserFriendlyErrorMessage } from "./errors";
import { log } from "./logger";
import { validatePathTraversal, normalizePath, isSameEntry } from "./paths";
import { fileExists, renameFile } from "./files";

/**
 * Check for conflicts in a batch of rename operations.
 * Recognizes within-batch moves: if a target is occupied by another
 * source that's being moved away, it's not a real conflict.
 */
export async function checkConflicts(operations: RenameOperation[]): Promise<string[]> {
  const conflicts: string[] = [];
  const targetPaths = new Set<string>();

  // Build the source paths that are being moved to a different name, bucketed by
  // normalized path. The bucket is only a cheap lookup key — a candidate still has
  // to be confirmed as the same file below, or a case-sensitive volume would treat
  // a differently-cased source as if it were vacating the target slot.
  const sourcesBeingMoved = new Map<string, string[]>();
  for (const op of operations) {
    if (!(await isSameEntry(op.oldPath, op.newPath))) {
      const key = normalizePath(op.oldPath);
      const bucket = sourcesBeingMoved.get(key);
      if (bucket) {
        bucket.push(op.oldPath);
      } else {
        sourcesBeingMoved.set(key, [op.oldPath]);
      }
    }
  }

  for (const op of operations) {
    // Check for path traversal attempts
    const traversalError = await validatePathTraversal(op.oldPath, op.newPath);
    if (traversalError) {
      conflicts.push(`"${basename(op.oldPath)}": ${traversalError}`);
      continue;
    }

    // Check for duplicate targets within the batch (case-insensitive on macOS)
    const normalizedNewPath = normalizePath(op.newPath);
    if (targetPaths.has(normalizedNewPath)) {
      conflicts.push(`Multiple files would be renamed to "${basename(op.newPath)}"`);
      targetPaths.add(normalizedNewPath);
      continue;
    }
    targetPaths.add(normalizedNewPath);

    // Check if target already exists (and isn't the source file itself — decided by
    // inode identity, so a case-only rename onto a distinct file on a case-sensitive
    // volume is reported as the conflict it is)
    if ((await fileExists(op.newPath)) && !(await isSameEntry(op.oldPath, op.newPath))) {
      // Not a conflict if the file at the target is itself being moved away in this batch
      let vacatedByBatch = false;
      for (const source of sourcesBeingMoved.get(normalizedNewPath) ?? []) {
        if (await isSameEntry(source, op.newPath)) {
          vacatedByBatch = true;
          break;
        }
      }

      if (!vacatedByBatch) {
        conflicts.push(`"${basename(op.newPath)}" already exists`);
      }
    }
  }

  return conflicts;
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
  onProgress?: (current: number, total: number, fileName: string) => void | Promise<void>,
): Promise<RenameResult[]> {
  const results: RenameResult[] = new Array(operations.length);

  // --- Phase 0: Detect within-batch conflicts ---
  // A source is "blocking" if another operation wants to write to its path.
  // Sources are bucketed by normalized path and every index in a bucket is kept: on a
  // case-sensitive volume two sources can differ only in case, and keeping just one
  // would stage the wrong file and leave the target still occupied.
  const sourcesByPath = new Map<string, number[]>();
  for (let i = 0; i < operations.length; i++) {
    const key = normalizePath(operations[i]!.oldPath);
    const bucket = sourcesByPath.get(key);
    if (bucket) {
      bucket.push(i);
    } else {
      sourcesByPath.set(key, [i]);
    }
  }

  const needsTemp = new Set<number>();
  for (const op of operations) {
    if (await isSameEntry(op.oldPath, op.newPath)) continue;
    for (const blockingIdx of sourcesByPath.get(normalizePath(op.newPath)) ?? []) {
      const blocking = operations[blockingIdx]!.oldPath;
      // The file at our target is also a source being moved — it needs to go to temp
      // first. Confirm it really occupies the target rather than merely sharing a
      // normalized key with it, and that it isn't this operation's own source.
      if ((await isSameEntry(blocking, op.newPath)) && !(await isSameEntry(blocking, op.oldPath))) {
        needsTemp.add(blockingIdx);
      }
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

    // Re-parent if this op's oldPath is inside a directory that was temped
    for (const [tIdx, tPath] of tempMap) {
      const originalDir = operations[tIdx]!.oldPath + path.sep;
      if (op.oldPath.startsWith(originalDir)) {
        return { ...op, oldPath: tPath + op.oldPath.slice(operations[tIdx]!.oldPath.length) };
      }
    }

    return op;
  });

  // Sort so needsTemp operations execute first (landing their temp file at the
  // final path before another operation can occupy the original slot), then by
  // path depth descending so children are renamed before parents.
  const indexed = adjustedOps
    .map((op, i) => ({ op, originalIndex: i }))
    .filter(({ originalIndex }) => !results[originalIndex]); // skip already-failed
  indexed.sort((a, b) => {
    const aIsTemp = needsTemp.has(a.originalIndex) ? 0 : 1;
    const bIsTemp = needsTemp.has(b.originalIndex) ? 0 : 1;
    if (aIsTemp !== bIsTemp) return aIsTemp - bIsTemp;
    const depthDiff =
      path.normalize(b.op.oldPath).split(path.sep).length - path.normalize(a.op.oldPath).split(path.sep).length;
    if (depthDiff !== 0) return depthDiff;
    return a.originalIndex - b.originalIndex;
  });

  for (let i = 0; i < indexed.length; i++) {
    const { op, originalIndex } = indexed[i]!;

    if (onProgress) {
      try {
        await onProgress(i + 1, indexed.length, basename(operations[originalIndex]!.oldPath));
      } catch (e) {
        log.files.warn("Progress callback failed", { error: e });
      }
    }

    const result = await renameFile(op.oldPath, op.newName);
    // Store with original oldPath so undo history is correct
    results[originalIndex] = {
      ...result,
      oldPath: operations[originalIndex]!.oldPath,
    };

    // After a successful directory rename, fix up the newPath of
    // already-processed child results so undo history stays correct
    // Exact string comparison: the question here is whether the recorded child paths
    // are now stale, which a case-only directory rename also makes true.
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
  // If a file was moved to temp but its final rename failed, restore it.
  // But only if another successful operation hasn't since claimed the slot
  // (fs.rename on POSIX overwrites, so restoring blindly would destroy data).
  const occupiedPaths = new Set(results.filter((r) => r?.success).map((r) => normalizePath(r!.newPath)));
  for (const [idx, tempPath] of tempMap) {
    if (results[idx] && !results[idx]!.success) {
      const originalPath = operations[idx]!.oldPath;
      if (occupiedPaths.has(normalizePath(originalPath))) {
        log.files.warn("Cannot restore temp file — slot occupied by another rename", { tempPath, originalPath });
        continue;
      }
      try {
        await rename(tempPath, originalPath);
        log.files.info("Restored temp file", { tempPath, originalPath });
      } catch {
        log.files.error("Could not restore temp file", { tempPath });
      }
    }
  }

  return results;
}
