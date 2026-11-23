import { readdir, rm, stat } from "node:fs/promises";
import { basename, join } from "node:path";

const recentLimit = 12;
const gracePeriod = 5 * 60_000;
const wallpaperFilename = /^[a-f0-9]{64}\.png$/;

export async function pruneWallpapers(directory: string, appliedPath: string, readReferences: () => Promise<unknown>) {
  const entries = (await readdir(directory, { withFileTypes: true })).filter(
    (entry) => entry.isFile() && wallpaperFilename.test(entry.name),
  );
  if (entries.length <= recentLimit) return;

  const files = await Promise.all(
    entries.map(async ({ name }) => ({
      name,
      modified: (await stat(join(directory, name))).mtimeMs,
    })),
  );
  files.sort((left, right) => right.modified - left.modified);
  const cutoff = Date.now() - gracePeriod;
  const candidates = files.slice(recentLimit).filter(({ modified }) => modified < cutoff);
  if (!candidates.length) return;

  const references = await readReferences();
  if (!Array.isArray(references)) return;
  const protectedFiles = new Set([basename(appliedPath)]);
  for (const name of references) {
    if (typeof name !== "string" || !wallpaperFilename.test(name)) return;
    protectedFiles.add(name);
  }
  await Promise.allSettled(
    candidates
      .filter(({ name }) => !protectedFiles.has(name))
      .map(({ name }) => rm(join(directory, name), { force: true })),
  );
}
