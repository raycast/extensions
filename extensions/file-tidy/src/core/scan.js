import fs from "node:fs";
import path from "node:path";

/**
 * List regular files to organize under sourceDir.
 * Skips hidden files, symlinks and (unless recursive) subdirectories.
 * excludeTopDirs: top-level dir names to skip entirely (in-place mode keeps
 * its category folders out of the source scan this way).
 * Returns [{ path, name, ext, size, birthtime, mtime }]
 */
export function scanSource(sourceDir, { recursive = false, excludeTopDirs } = {}) {
  const files = [];
  walk(sourceDir, files, recursive, excludeTopDirs);
  return files;
}

function walk(dir, out, recursive, excludeDirs) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (excludeDirs?.has(entry.name)) continue;
      if (recursive) walk(full, out, recursive);
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = fs.statSync(full);
    out.push({
      path: full,
      name: entry.name,
      ext: path.extname(entry.name).slice(1).toLowerCase(),
      size: stat.size,
      birthtime: realBirthtime(stat),
      mtime: stat.mtime,
    });
  }
}

/**
 * Recursively list already-archived files in destDir (for cross-run dedup),
 * excluding the .tidy bookkeeping dir and the Duplicates quarantine.
 * onlyDirs: restrict to these top-level dirs and ignore loose files —
 * in-place mode uses this so unorganized source files aren't counted as
 * already archived (they'd otherwise dedup against themselves).
 */
export function scanDest(destDir, { onlyDirs } = {}) {
  const files = [];
  if (!fs.existsSync(destDir)) return files;
  const skip = new Set([".tidy", "Duplicates"]);
  for (const entry of fs.readdirSync(destDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || skip.has(entry.name)) continue;
    const full = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (onlyDirs && !onlyDirs.has(entry.name)) continue;
      walk(full, files, true);
    } else if (entry.isFile()) {
      if (onlyDirs) continue;
      const stat = fs.statSync(full);
      files.push({ path: full, name: entry.name, size: stat.size, birthtime: realBirthtime(stat) });
    }
  }
  return files;
}

/** Filesystems without creation-time support report epoch 0 — fall back to mtime. */
function realBirthtime(stat) {
  return stat.birthtime.getTime() > 0 ? stat.birthtime : stat.mtime;
}

export function classify(file, extIndex, fallbackCategory) {
  return extIndex.get(file.ext) ?? fallbackCategory;
}
