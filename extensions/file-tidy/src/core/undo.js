import fs from "node:fs";
import path from "node:path";

/** Revert the most recent run by moving every file back, then retire the manifest. */
export function undoLastRun(destDir) {
  const runsDir = path.join(destDir, ".tidy", "runs");
  if (!fs.existsSync(runsDir)) {
    console.log("No tidy run to undo.");
    return;
  }
  const runs = fs
    .readdirSync(runsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (!runs.length) {
    console.log("No tidy run to undo.");
    return;
  }
  const latest = path.join(runsDir, runs.at(-1));
  const { moves, sourceDir, time } = JSON.parse(fs.readFileSync(latest, "utf8"));

  let restored = 0;
  const failures = [];
  for (const { from, to } of moves) {
    try {
      if (!fs.existsSync(to)) throw new Error("archived file is no longer there");
      fs.mkdirSync(path.dirname(from), { recursive: true });
      if (fs.existsSync(from)) throw new Error("a file with the same name exists at the original location");
      fs.renameSync(to, from);
      restored++;
    } catch (err) {
      failures.push({ to, from, reason: err.message });
    }
  }

  if (!failures.length) {
    fs.renameSync(latest, `${latest}.undone`);
    console.log(`Undid the run from ${time}: ${restored} files moved back to ${sourceDir}`);
  } else {
    console.log(`Partial undo: ${restored} succeeded, ${failures.length} failed (manifest kept):`);
    for (const f of failures) console.log(`  ${f.to} -> ${f.from}: ${f.reason}`);
  }

  cleanupEmptyDirs(moves, destDir);
}

/**
 * After files move back, remove now-empty directories this run had created:
 * walk up from each move target toward destDir, rmdir-ing truly empty dirs.
 * Never touches destDir itself, never deletes files (rmdir fails on non-empty).
 */
function cleanupEmptyDirs(moves, destDir) {
  for (const { to } of moves) {
    let dir = path.dirname(to);
    while (dir.startsWith(destDir + path.sep)) {
      if (fs.existsSync(dir)) {
        if (fs.readdirSync(dir).length) break;
        fs.rmdirSync(dir);
      }
      dir = path.dirname(dir);
    }
  }
}
