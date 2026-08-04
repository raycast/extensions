import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { moveFile } from "./move.js";

/**
 * Execute the plan: move every file, resolving name collisions with " (n)"
 * suffixes. The run manifest is rewritten after every move so that undo can
 * restore whatever was moved even if a later step fails. Appends to the
 * Duplicates manifest (formatDupBlock lets adapters localize its text).
 * Returns { moved, manifestPath }.
 */
export function executePlan(entries, { destDir, sourceDir, formatDupBlock = defaultDupBlock }) {
  const runsDir = path.join(destDir, ".tidy", "runs");
  fs.mkdirSync(runsDir, { recursive: true });
  const time = new Date().toISOString();
  // The ISO timestamp alone collides for two runs started in the same
  // millisecond, and the second one would overwrite the first one's only undo
  // record. hrtime keeps the names sorting in start order (undo picks the last
  // one); the uuid makes them unique even across processes.
  const order = process.hrtime.bigint().toString().padStart(20, "0");
  const manifestPath = path.join(runsDir, `${time.replace(/[:.]/g, "-")}-${order}-${crypto.randomUUID()}.json`);

  const moved = [];
  // Directories this run actually had to create. Undo removes only these, so a
  // folder that already existed before the run survives being emptied.
  const createdDirs = new Set();
  // Write-then-rename so a half-written update (e.g. volume fills up) can
  // never truncate the only undo record — the last good manifest survives.
  const writeManifest = () => {
    const tmp = `${manifestPath}.tmp`;
    fs.writeFileSync(
      tmp,
      JSON.stringify(
        {
          time,
          sourceDir,
          moves: moved.map(({ from, to, action }) => ({ from, to, action })),
          createdDirs: [...createdDirs],
        },
        null,
        2,
      ),
    );
    fs.renameSync(tmp, manifestPath);
  };

  // The dup manifest's path is fixed before anything moves, so a duplicate
  // that is itself named "manifest.md" gets a " (n)" suffix instead of landing
  // on the reserved name and having dedup records appended into it.
  // The folder is derived from the entries rather than rebuilt here, so the
  // configured prefix (and the sticky un-prefixed fallback) is honored.
  const dupEntries = entries.filter((e) => e.action === "duplicate");
  const dupManifest = dupEntries.length ? path.join(path.dirname(dupEntries[0].to), "manifest.md") : null;

  for (const entry of entries) {
    const finalTo = resolveCollision(entry.to, dupManifest);
    // Collected before the mkdir, while "doesn't exist yet" is still true.
    for (const dir of missingDirs(path.dirname(finalTo), destDir)) createdDirs.add(dir);
    // Record the move before performing it, so a move can never happen without
    // a manifest entry. Undo treats a recorded-but-never-performed move (file
    // still at `from`, nothing at `to`) as a no-op.
    moved.push({ ...entry, to: finalTo });
    writeManifest();
    fs.mkdirSync(path.dirname(finalTo), { recursive: true });
    moveFile(entry.from, finalTo);
  }

  const dups = moved.filter((e) => e.action === "duplicate");
  if (dups.length) {
    // The keeper was recorded at its pre-move location; by now it has been
    // archived. Rewrite it to where it actually landed, otherwise the manifest
    // points at a path that no longer exists.
    const finalPath = new Map(moved.map((e) => [e.from, e.to]));
    const resolved = dups.map((d) => ({ ...d, keeperPath: finalPath.get(d.keeperPath) ?? d.keeperPath }));
    fs.mkdirSync(path.dirname(dupManifest), { recursive: true });
    fs.appendFileSync(dupManifest, formatDupBlock(resolved));
  }
  return { moved, manifestPath };
}

/** Directories between `dir` and `stopDir` that don't exist yet, deepest first. */
function missingDirs(dir, stopDir) {
  const missing = [];
  while (dir !== stopDir && dir.startsWith(stopDir + path.sep)) {
    if (fs.existsSync(dir)) break;
    missing.push(dir);
    dir = path.dirname(dir);
  }
  return missing;
}

function resolveCollision(target, reserved = null) {
  if (target !== reserved && !fs.existsSync(target)) return target;
  const dir = path.dirname(target);
  const ext = path.extname(target);
  const base = path.basename(target, ext);
  for (let i = 1; ; i++) {
    const candidate = path.join(dir, `${base} (${i})${ext}`);
    if (candidate !== reserved && !fs.existsSync(candidate)) return candidate;
  }
}

function defaultDupBlock(dups) {
  const lines = [`\n## ${new Date().toISOString()}\n`];
  for (const d of dups) {
    lines.push(
      `- \`${path.basename(d.to)}\` is byte-identical to the kept copy \`${d.keeperPath}\` (SHA-256: ${d.hash.slice(0, 16)}…)`,
    );
  }
  return lines.join("\n") + "\n";
}
