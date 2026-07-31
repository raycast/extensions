import fs from "node:fs";
import path from "node:path";
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

export function getLastRun(destDir) {
  const runsDir = path.join(destDir, ".tidy", "runs");
  const runs = fs.existsSync(runsDir)
    ? fs
        .readdirSync(runsDir)
        .filter((f) => f.endsWith(".json"))
        .sort()
    : [];
  if (!runs.length) return null;

  const manifestPath = path.join(runsDir, runs.at(-1));
  return readRun(manifestPath, destDir);
}

export function undoRun(destDir, manifestPath) {
  const runsDir = path.resolve(destDir, ".tidy", "runs");
  const resolvedManifestPath = path.resolve(manifestPath);
  if (
    path.relative(path.dirname(resolvedManifestPath), runsDir) !== "" ||
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
        // `to` and the file still at `from` is a move that never happened.
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
    return { ...record, createdDirs: record.createdDirs ?? [], manifestPath };
  } catch (cause) {
    const error = new Error(`Invalid tidy record: ${manifestPath}`, { cause });
    error.code = "MANIFEST_CORRUPT";
    error.manifestPath = manifestPath;
    throw error;
  }
}

function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * After files move back, remove now-empty directories this run had created.
 * Never touches destDir itself, never deletes files (rmdir fails on non-empty).
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
