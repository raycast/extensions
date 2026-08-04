import fs from "node:fs";
import path from "node:path";
import { canonicalPath, isInsideDir, tidyPath } from "./config.js";
import { moveFile } from "./move.js";

/**
 * Revert the most recent run by moving every file back.
 * Returns null when there is no run to undo, otherwise
 * { time, sourceDir, manifestPath, restored, failures, removedDirs, retired }.
 * `retired` is true when every file went back and the manifest was renamed to
 * *.undone. Failure codes: "missing" (file no longer at its archived
 * location), "occupied" (original location taken), "error" (fs error, see
 * `message`). Adapters own all user-facing wording.
 */
export function undoLastRun(destDir) {
  const run = getLastRun(destDir);
  return run ? undoRun(destDir, run.manifestPath) : null;
}

/**
 * The run that undoLastRun would revert, without reverting it — adapters use
 * this to describe the run in a confirmation prompt. Throws MANIFEST_CORRUPT
 * if the record is unreadable or malformed.
 */
export function getLastRun(destDir) {
  const runsDir = tidyPath(destDir, "runs");
  const runs = fs.existsSync(runsDir)
    ? fs
        .readdirSync(runsDir)
        .filter((f) => f.endsWith(".json"))
        .sort()
    : [];
  if (!runs.length) return null;

  return readRun(path.join(runsDir, runs.at(-1)), destDir);
}

/**
 * Revert one specific run. Returns null when the manifest isn't a record under
 * destDir's own .tidy/runs, or no longer exists (e.g. already undone between
 * the confirmation prompt and the confirmation).
 */
export function undoRun(destDir, manifestPath) {
  const runsDir = tidyPath(destDir, "runs");
  const resolvedManifestPath = path.resolve(manifestPath);
  // Canonicalized, like every other containment check here: comparing the
  // spelling alone accepts <destDir>/.tidy/runs/x.json when runs is a symlink,
  // and undo would then execute a manifest planted outside destDir and rename
  // that foreign file to *.undone on its way out.
  if (
    !isInside(runsDir, resolvedManifestPath) ||
    canonicalPath(path.dirname(resolvedManifestPath)) !== canonicalPath(runsDir) ||
    !path.basename(resolvedManifestPath).endsWith(".json") ||
    !fs.existsSync(resolvedManifestPath)
  ) {
    return null;
  }
  const { moves, sourceDir, time, createdDirs, manifestPath: runManifestPath } = readRun(resolvedManifestPath, destDir);

  let restored = 0;
  const failures = [];
  for (const { from, to } of moves) {
    try {
      if (!fs.existsSync(to)) {
        // The manifest is written before each move, so an entry with nothing at
        // `to` and the file still at `from` is a move that never happened —
        // a no-op for undo, and nothing was restored by it.
        if (!fs.existsSync(from)) failures.push({ from, to, code: "missing" });
        continue;
      }
      if (fs.existsSync(from)) {
        failures.push({ from, to, code: "occupied" });
        continue;
      }
      fs.mkdirSync(path.dirname(from), { recursive: true });
      moveFile(to, from);
      restored++;
    } catch (err) {
      failures.push({ from, to, code: "error", message: err.message });
    }
  }

  const retired = !failures.length;
  if (retired) fs.renameSync(runManifestPath, `${runManifestPath}.undone`);
  const removedDirs = cleanupEmptyDirs(createdDirs, destDir);
  return { time, sourceDir, manifestPath: runManifestPath, restored, failures, removedDirs, retired };
}

/**
 * Parse and validate a run record. Every path is checked to stay inside the
 * directories the run declared, so a corrupted or hand-edited manifest can't
 * make undo write outside sourceDir or delete outside destDir.
 */
function readRun(manifestPath, destDir) {
  try {
    const record = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (
      !record ||
      typeof record !== "object" ||
      typeof record.time !== "string" ||
      typeof record.sourceDir !== "string" ||
      !Array.isArray(record.moves) ||
      !record.moves.every(
        (move) =>
          move &&
          typeof move === "object" &&
          typeof move.from === "string" &&
          path.isAbsolute(move.from) &&
          isInside(record.sourceDir, move.from) &&
          typeof move.to === "string" &&
          path.isAbsolute(move.to) &&
          isInside(destDir, move.to),
      ) ||
      (record.createdDirs !== undefined &&
        (!Array.isArray(record.createdDirs) ||
          !record.createdDirs.every((dir) => typeof dir === "string" && isInside(destDir, dir))))
    ) {
      throw new Error("The tidy record has an invalid shape");
    }
    // Records written before createdDirs existed leave the folders behind
    // rather than guessing which ones this run had created — an empty leftover
    // folder is cheap, deleting one the user already had is not.
    return { ...record, createdDirs: record.createdDirs ?? [], manifestPath };
  } catch (cause) {
    // code + manifestPath let adapters render this in their own language.
    const e = new Error(`Invalid tidy record: ${manifestPath}`, { cause });
    e.code = "MANIFEST_CORRUPT";
    e.manifestPath = manifestPath;
    throw e;
  }
}

/**
 * Containment resolved through symlinks, not just spelled out lexically.
 * `<destDir>/ft_Images/x` passes a purely textual check even when ft_Images is
 * a symlink pointing out of destDir — and rename, mkdir and rmdir all follow
 * that link, so undo would restore and delete outside the selected trees.
 * canonicalPath resolves the deepest existing ancestor, so a path whose tail
 * doesn't exist yet is still judged by where its parent really lives.
 *
 * This closes the check, not the race: a symlink swapped in between this call
 * and the operation itself would still be followed. Ruling that out needs
 * openat/O_NOFOLLOW, which node's fs API doesn't expose.
 */
function isInside(parent, child) {
  return isInsideDir(canonicalPath(parent), canonicalPath(child));
}

/**
 * After files move back, remove the directories this run had created, deepest
 * first — a folder that already existed before the run is never touched, and
 * neither is one that still holds anything (the dup manifest keeps Duplicates
 * around, by design). Never touches destDir itself, never deletes files.
 */
function cleanupEmptyDirs(createdDirs, destDir) {
  const removed = [];
  const deepestFirst = [...createdDirs].sort((a, b) => b.length - a.length);
  for (const dir of deepestFirst) {
    if (dir === destDir || !isInside(destDir, dir) || !fs.existsSync(dir) || fs.readdirSync(dir).length) continue;
    fs.rmdirSync(dir);
    removed.push(dir);
  }
  return removed;
}
