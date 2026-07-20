import fs from "node:fs";
import path from "node:path";

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
  const runsDir = path.join(destDir, ".tidy", "runs");
  const runs = fs.existsSync(runsDir)
    ? fs
        .readdirSync(runsDir)
        .filter((f) => f.endsWith(".json"))
        .sort()
    : [];
  if (!runs.length) return null;

  const manifestPath = path.join(runsDir, runs.at(-1));
  const { moves, sourceDir, time } = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  let restored = 0;
  const failures = [];
  for (const { from, to } of moves) {
    try {
      if (!fs.existsSync(to)) {
        // The manifest is written before each move, so an entry with nothing at
        // `to` and the file still at `from` is a move that never happened.
        if (fs.existsSync(from)) restored++;
        else failures.push({ from, to, code: "missing" });
        continue;
      }
      if (fs.existsSync(from)) {
        failures.push({ from, to, code: "occupied" });
        continue;
      }
      fs.mkdirSync(path.dirname(from), { recursive: true });
      fs.renameSync(to, from);
      restored++;
    } catch (err) {
      failures.push({ from, to, code: "error", message: err.message });
    }
  }

  const retired = !failures.length;
  if (retired) fs.renameSync(manifestPath, `${manifestPath}.undone`);
  const removedDirs = cleanupEmptyDirs(moves, destDir);
  return { time, sourceDir, manifestPath, restored, failures, removedDirs, retired };
}

/**
 * After files move back, remove now-empty directories this run had created:
 * walk up from each move target toward destDir, rmdir-ing truly empty dirs.
 * Never touches destDir itself, never deletes files (rmdir fails on non-empty).
 */
function cleanupEmptyDirs(moves, destDir) {
  const removed = [];
  for (const { to } of moves) {
    let dir = path.dirname(to);
    while (dir.startsWith(destDir + path.sep)) {
      if (fs.existsSync(dir)) {
        if (fs.readdirSync(dir).length) break;
        fs.rmdirSync(dir);
        removed.push(dir);
      }
      dir = path.dirname(dir);
    }
  }
  return removed;
}
