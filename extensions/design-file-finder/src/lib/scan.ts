import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import fg from "fast-glob";
import { FileRecord, ScanRoot } from "./types";
import { runMdfind } from "./mdfind";
import { defForPath } from "./extensions";
import { dedupe } from "./merge";
import { enrichLastUsed } from "./mdls";

/** Heavy directories never worth walking for design files. */
const IGNORE: string[] = [
  "**/node_modules/**",
  "**/.git/**",
  "**/Library/**",
  "**/System/**",
  "**/.Trash/**",
  "**/.Trashes/**",
  "**/private/var/**",
  "**/.cache/**",
  "**/Caches/**",
  "**/.npm/**",
  "**/.cocoapods/**",
];

/** Root the non-indexed walk: home for the system volume, the path itself otherwise. */
export function walkRoot(root: ScanRoot, home: string = homedir()): string {
  return root.isRoot ? home : root.path;
}

/**
 * True when a path lives in an Adobe auto-save directory (e.g.
 * "Adobe Premiere Pro Auto-Save", "Adobe After Effects Auto-Save"). These are
 * timestamped backup churn, not files you launch, so they're filtered by default.
 */
export function isAutoSavePath(path: string): boolean {
  // Match an "Auto-Save" / "AutoSave" *directory* segment (trailing slash required,
  // so a file merely named "...Auto-Save" isn't filtered). \b avoids "autosaved".
  return /\/[^/]*\bauto[-\s]?save\b[^/]*\//i.test(path);
}

export async function scanRoot(root: ScanRoot, exts: string[]): Promise<string[]> {
  if (exts.length === 0) return [];
  if (root.indexed && !root.walk) {
    // mdfind -onlyin scopes to any directory subtree, not just volume roots.
    return runMdfind(root.path, exts);
  }
  const patterns = exts.map((e) => `**/*.${e}`);
  try {
    return await fg(patterns, {
      cwd: walkRoot(root),
      absolute: true,
      onlyFiles: true,
      caseSensitiveMatch: false,
      followSymbolicLinks: false,
      suppressErrors: true,
      dot: false,
      ignore: IGNORE,
      // No `deep` cap: an arbitrary depth limit silently drops files in deeply
      // nested project trees. The IGNORE list prunes the heavy/system dirs instead.
    });
  } catch {
    return [];
  }
}

export async function pathsToRecords(paths: string[], volume: string): Promise<FileRecord[]> {
  const out: FileRecord[] = [];
  await Promise.all(
    paths.map(async (p) => {
      const def = defForPath(p);
      if (!def) return;
      const slash0 = p.lastIndexOf("/");
      // Skip AppleDouble sidecars ("._Foo.psd") — metadata files, not real docs.
      if (p.slice(slash0 + 1).startsWith("._")) return;
      try {
        const s = await stat(p);
        if (!s.isFile()) return;
        const slash = p.lastIndexOf("/");
        out.push({
          path: p,
          name: slash >= 0 ? p.slice(slash + 1) : p,
          ext: def.ext,
          app: def.app,
          folder: slash >= 0 ? p.slice(0, slash) : "",
          volume,
          modifiedMs: s.mtimeMs,
          lastUsedMs: null,
          sizeBytes: s.size,
        });
      } catch {
        // file vanished or unreadable — skip
      }
    }),
  );
  return out;
}

export interface ScanOptions {
  enrichRecency?: boolean;
}

export interface ScanOutcome {
  records: FileRecord[];
  /** true when recency enrichment hit its cap (some files use mtime only) */
  enrichCapped: boolean;
}

export async function scanAll(
  roots: ScanRoot[],
  exts: string[],
  opts: ScanOptions = {},
): Promise<ScanOutcome> {
  const perRoot = await Promise.all(
    roots.map(async (r) => pathsToRecords(await scanRoot(r, exts), r.path)),
  );
  const records = dedupe(perRoot.flat());

  let enrichCapped = false;
  if (opts.enrichRecency) {
    const indexedVolumes = new Set(roots.filter((r) => r.indexed).map((r) => r.path));
    if (indexedVolumes.size > 0) {
      const res = await enrichLastUsed(records, { indexedVolumes });
      enrichCapped = res.capped;
    }
  }

  return { records, enrichCapped };
}
