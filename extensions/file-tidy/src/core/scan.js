import fs from "node:fs";
import path from "node:path";
import { isJunk } from "./health.js";

/**
 * List regular files to organize under sourceDir.
 * Skips hidden files, symlinks and (unless recursive) subdirectories.
 * excludeTopDirs: top-level dir names to skip entirely (in-place mode keeps
 * its category folders out of the source scan this way).
 * Returns [{ path, name, ext, size, birthtime, mtime }]
 */
export function scanSource(sourceDir, { recursive = false, excludeTopDirs, includeJunk = false } = {}) {
  const files = [];
  walk(sourceDir, files, recursive, excludeTopDirs, includeJunk);
  return files;
}

function walk(dir, out, recursive, excludeDirs, includeJunk) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // Hidden entries stay out of scope — except the handful of known OS junk
    // names, which the health pass exists to sweep up.
    if (entry.name.startsWith(".") && !(includeJunk && isJunk(entry.name))) continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (excludeDirs?.has(entry.name)) continue;
      if (recursive) walk(full, out, recursive, undefined, includeJunk);
      continue;
    }
    if (!entry.isFile()) continue;
    const file = toSourceFile(full, entry.name);
    if (file) out.push(file);
  }
}

/**
 * The one place the file record shape is built — walk and scanDest drifted
 * apart when each spelled it out. Returns null when the entry is gone or
 * unreadable by the time it's stat'ed: a browser finishing a download renames
 * its temp file mid-scan, and that must not abort the scan of everything else.
 */
function toSourceFile(full, name) {
  let stat;
  try {
    stat = fs.statSync(full);
  } catch {
    return null;
  }
  return {
    path: full,
    name,
    ext: path.extname(name).slice(1).toLowerCase(),
    size: stat.size,
    birthtime: realBirthtime(stat),
    mtime: stat.mtime,
  };
}

/**
 * Recursively list already-archived files in destDir (for cross-run dedup).
 * skipDirs: top-level dir names to exclude — callers MUST pass every
 * quarantine spelling (see quarantineDirNames in config.js), or rejected
 * copies get rescanned as archived content; only dot-dirs are skipped
 * unconditionally.
 * onlyDirs: restrict to these top-level dirs and ignore loose files —
 * in-place mode uses this so unorganized source files aren't counted as
 * already archived (they'd otherwise dedup against themselves).
 */
export function scanDest(destDir, { onlyDirs, skipDirs } = {}) {
  const files = [];
  if (!fs.existsSync(destDir)) return files;
  const skip = skipDirs ?? new Set();
  for (const entry of fs.readdirSync(destDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || skip.has(entry.name)) continue;
    const full = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (onlyDirs && !onlyDirs.has(entry.name)) continue;
      walk(full, files, true);
    } else if (entry.isFile()) {
      if (onlyDirs) continue;
      const file = toSourceFile(full, entry.name);
      if (file) files.push(file);
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

/**
 * Compile config.subCategories into { category -> [{ name, test(file) }] }.
 * Invalid regex sources are dropped rather than thrown, so one bad hand-edited
 * rule can't break every run — callers get the rules that do compile.
 */
export function buildSubIndex(subCategories = {}) {
  const index = new Map();
  for (const [category, rules] of Object.entries(subCategories)) {
    if (!Array.isArray(rules)) continue;
    const compiled = [];
    for (const rule of rules) {
      if (!rule?.name) continue;
      const exts = new Set(list(rule.exts).map((e) => String(e).toLowerCase().replace(/^\./, "")));
      const patterns = [];
      for (const src of list(rule.match)) {
        try {
          patterns.push(new RegExp(src, "i"));
        } catch {
          // Skip an unparsable pattern; the rest of the rule still applies.
        }
      }
      if (!exts.size && !patterns.length) continue;
      compiled.push({
        name: rule.name,
        test: (file) => exts.has(file.ext) || patterns.some((re) => re.test(file.name)),
      });
    }
    if (compiled.length) index.set(category, compiled);
  }
  return index;
}

/** A hand-edited rule can hold anything; only a real list is worth iterating. */
function list(value) {
  return Array.isArray(value) ? value : [];
}

/** First matching sub-rule for the file's category, or null. */
export function subClassify(file, category, subIndex) {
  for (const rule of subIndex.get(category) ?? []) {
    if (rule.test(file)) return rule.name;
  }
  return null;
}
