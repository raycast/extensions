import fs from "node:fs";
import path from "node:path";

/**
 * Execute the plan: move every file, resolving name collisions with " (n)"
 * suffixes. The run manifest is rewritten after every move so that undo can
 * restore whatever was moved even if a later step fails. Appends to the
 * Duplicates manifest. Returns { moved, manifestPath }.
 */
export function executePlan(entries, { destDir, sourceDir }) {
  const runsDir = path.join(destDir, ".tidy", "runs");
  fs.mkdirSync(runsDir, { recursive: true });
  const time = new Date().toISOString();
  const manifestPath = path.join(runsDir, `${time.replace(/[:.]/g, "-")}.json`);

  const moved = [];
  const writeManifest = () =>
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          time,
          sourceDir,
          moves: moved.map(({ from, to, action }) => ({ from, to, action })),
        },
        null,
        2,
      ),
    );

  for (const entry of entries) {
    const finalTo = resolveCollision(entry.to);
    fs.mkdirSync(path.dirname(finalTo), { recursive: true });
    moveFile(entry.from, finalTo);
    moved.push({ ...entry, to: finalTo });
    writeManifest();
  }

  appendDuplicatesManifest(
    moved.filter((e) => e.action === "duplicate"),
    destDir,
  );
  return { moved, manifestPath };
}

/** rename, falling back to copy+verify+unlink across volumes. */
function moveFile(from, to) {
  try {
    fs.renameSync(from, to);
  } catch (err) {
    if (err.code !== "EXDEV") throw err;
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    const [a, b] = [fs.statSync(from), fs.statSync(to)];
    if (a.size !== b.size) {
      fs.unlinkSync(to);
      throw new Error(`Cross-volume copy verification failed: ${from}`);
    }
    fs.unlinkSync(from);
  }
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

function appendDuplicatesManifest(dups, destDir) {
  if (!dups.length) return;
  const manifest = path.join(destDir, "Duplicates", "manifest.md");
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  const lines = [`\n## ${new Date().toISOString()}\n`];
  for (const d of dups) {
    lines.push(
      `- \`${path.basename(d.to)}\` is byte-identical to the kept copy \`${d.keeperPath}\` (SHA-256: ${d.hash.slice(0, 16)}…)`,
    );
  }
  fs.appendFileSync(manifest, lines.join("\n") + "\n");
}
