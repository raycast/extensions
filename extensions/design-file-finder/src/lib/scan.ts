import { Dirent } from "node:fs";
import { readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { FileRecord, ScanRoot } from "./types";
import { runMdfind } from "./mdfind";
import { defForPath, extOf } from "./extensions";
import { dedupe } from "./merge";
import { enrichLastUsed } from "./mdls";

/** Directory basenames never worth descending into for design files. */
const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "Library",
  "System",
  ".Trash",
  ".Trashes",
  ".cache",
  "Caches",
  ".npm",
  ".cocoapods",
]);

/** True for `/`, `/Volumes`, or a bare `/Volumes/<name>` mount — too broad to follow via symlink. */
export function isMountRoot(resolved: string): boolean {
  if (resolved === "/") return true;
  return resolved === "/Volumes" || /^\/Volumes\/[^/]+$/.test(resolved);
}

/** True when `resolved` is the scan root or a directory beneath it. */
export function isPathContainedIn(resolved: string, root: string): boolean {
  if (resolved === root) return true;
  if (root === "/") return resolved.startsWith("/");
  return resolved.startsWith(`${root}/`);
}

function shouldSkipDirName(name: string): boolean {
  if (name === "." || name === "..") return true;
  if (name.startsWith(".")) return true;
  return IGNORED_DIR_NAMES.has(name);
}

/**
 * Walk `start` for files whose extension is in `exts`.
 * Follows directory symlinks inside the chosen folder (e.g. a `projects` link to
 * another subfolder), but bounds traversal: each realpath is visited at most once
 * (breaks cycles) and followed symlinks must resolve inside the scan root (avoids
 * escaping into other paths or entire volumes).
 */
export async function walkDesignFiles(start: string, exts: string[]): Promise<string[]> {
  if (exts.length === 0) return [];
  const wanted = new Set(exts.map((e) => e.toLowerCase()));
  const found: string[] = [];
  const visited = new Set<string>();
  let scanRoot: string;
  try {
    scanRoot = await realpath(start);
  } catch {
    return [];
  }

  async function visit(dir: string, viaSymlink: boolean): Promise<void> {
    let resolved: string;
    try {
      resolved = await realpath(dir);
    } catch {
      return;
    }
    if (visited.has(resolved)) return;
    if (viaSymlink && (isMountRoot(resolved) || !isPathContainedIn(resolved, scanRoot))) return;
    visited.add(resolved);

    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      // Match prior fast-glob `dot: false` + IGNORE list: skip dot entries and
      // heavy/system directory names before descending or following links.
      if (shouldSkipDirName(entry.name)) continue;

      const full = join(dir, entry.name);

      if (entry.isSymbolicLink()) {
        try {
          const target = await stat(full);
          if (target.isDirectory()) {
            await visit(full, true);
          } else if (target.isFile() && wanted.has(extOf(full))) {
            found.push(full);
          }
        } catch {
          // dangling or unreadable link — skip
        }
        continue;
      }

      if (entry.isDirectory()) {
        await visit(full, viaSymlink);
        continue;
      }

      if (entry.isFile() && wanted.has(extOf(full))) {
        found.push(full);
      }
    }
  }

  await visit(start, false);
  return found;
}

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
  try {
    return await walkDesignFiles(walkRoot(root), exts);
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
}

export async function scanAll(roots: ScanRoot[], exts: string[], opts: ScanOptions = {}): Promise<ScanOutcome> {
  const perRoot = await Promise.all(roots.map(async (r) => pathsToRecords(await scanRoot(r, exts), r.path)));
  const records = dedupe(perRoot.flat());

  if (opts.enrichRecency) {
    const indexedVolumes = new Set(roots.filter((r) => r.indexed).map((r) => r.path));
    if (indexedVolumes.size > 0) {
      await enrichLastUsed(records, { indexedVolumes });
    }
  }

  return { records };
}
