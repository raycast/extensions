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
  const order = process.hrtime.bigint().toString().padStart(20, "0");
  const manifestPath = path.join(runsDir, `${time.replace(/[:.]/g, "-")}-${order}-${crypto.randomUUID()}.json`);

  const moved = [];
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

  for (const entry of entries) {
    const finalTo = resolveCollision(entry.to);
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
    const manifest = path.join(destDir, "Duplicates", "manifest.md");
    fs.mkdirSync(path.dirname(manifest), { recursive: true });
    fs.appendFileSync(manifest, formatDupBlock(dups));
  }
  return { moved, manifestPath };
}

function missingDirs(dir, stopDir) {
  const missing = [];
  while (dir !== stopDir && dir.startsWith(stopDir + path.sep)) {
    if (fs.existsSync(dir)) break;
    missing.push(dir);
    dir = path.dirname(dir);
  }
  return missing;
}

function resolveCollision(target) {
  if (!fs.existsSync(target)) return target;
  const dir = path.dirname(target);
  const ext = path.extname(target);
  const base = path.basename(target, ext);
  for (let i = 1; ; i++) {
    const candidate = path.join(dir, `${base} (${i})${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
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
