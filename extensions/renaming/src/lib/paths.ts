/**
 * Shared path helpers for rename operations.
 */

import { lstat, readdir, realpath } from "fs/promises";
import { dirname, join, resolve } from "path";

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
 * Group paths that a case-insensitive filesystem would collapse onto each other.
 *
 * This is a deliberately conservative bucketing key, not a claim that two paths are
 * the same file — on a case-sensitive volume it groups paths that are in fact
 * distinct. Use it to decide which comparisons are worth making; use
 * {@link isSameFile} to decide whether two paths actually are one file.
 */
export function normalizePath(filePath: string): string {
  return process.platform === "darwin" || process.platform === "win32" ? filePath.toLowerCase() : filePath;
}

/**
 * Check whether two paths refer to the same underlying filesystem entry.
 *
 * Compares device + inode rather than the path strings, so the answer is a property
 * of the volume rather than of the platform. macOS is case-insensitive by default
 * but not by requirement — APFS can be formatted case-sensitive. On a
 * case-insensitive volume `FOO.txt` and `foo.txt` resolve to one inode and a
 * case-only rename is a no-op; on a case-sensitive volume they are two files and
 * that same rename would overwrite one with the other.
 *
 * Uses `lstat`, not `stat`: rename operates on the directory entry, so two distinct
 * symlinks pointing at one target are different files for this purpose.
 *
 * Two identical paths are trivially one entry and answer true without touching the
 * filesystem. Otherwise, returns false when either path cannot be stat'd (it does
 * not exist, or vanished mid-operation) — the conservative answer, which makes
 * callers treat the destination as a distinct file and refuse to overwrite it.
 */
export async function isSameFile(a: string, b: string): Promise<boolean> {
  if (a === b) {
    return true;
  }

  try {
    const [statA, statB] = await Promise.all([lstat(a), lstat(b)]);
    return statA.dev === statB.dev && statA.ino === statB.ino;
  } catch {
    return false;
  }
}

/**
 * Check whether renaming `from` to `to` would land on the very entry being renamed.
 *
 * This is the only case in which the "target already exists" guard may be skipped,
 * and it is narrower than {@link isSameFile}. Sharing an inode is not enough: two
 * hard links are one file under two distinct directory entries, and POSIX rename()
 * between them does nothing at all, so letting one through would report a rename
 * that never happened while both entries remain on disk.
 *
 * When both spellings reach one inode, the two are told apart by counting entries,
 * never by comparing names — a case-insensitive volume resolves case *and* Unicode
 * normalization, and string comparison would have to replicate its exact folding
 * rules to be right. Instead:
 *
 * - A directory is always its own sole entry (hard links to directories don't
 *   exist), so same inode means same entry.
 * - A file whose inode has a single link anywhere (`nlink === 1`) has exactly one
 *   entry for both spellings to resolve to — same entry.
 * - Otherwise, count this directory's entries sharing the inode. One means the
 *   remaining links live elsewhere and both spellings still resolve to it — same
 *   entry. Two or more means `to` may be a distinct entry, and the guard applies.
 *   This conservatively blocks a case-only rename of a file that also has a hard
 *   link in the same directory, which is the safe direction: rename() between two
 *   links is a silent no-op, not an overwrite.
 */
export async function isSameEntry(from: string, to: string): Promise<boolean> {
  if (from === to) {
    return true;
  }

  if (!(await isSameFile(from, to))) {
    return false;
  }

  try {
    const fromStat = await lstat(from);
    if (fromStat.isDirectory() || fromStat.nlink === 1) {
      return true;
    }

    const dir = dirname(to);
    const entries = await readdir(dir);
    let linksInDir = 0;
    for (const entry of entries) {
      const entryStat = await lstat(join(dir, entry)).catch(() => null);
      if (entryStat && entryStat.dev === fromStat.dev && entryStat.ino === fromStat.ino) {
        linksInDir++;
        if (linksInDir > 1) {
          return false;
        }
      }
    }
    return linksInDir === 1;
  } catch {
    return false;
  }
}
