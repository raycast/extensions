import { Drive, ScanRoot } from "./types";

/** The mounted drive that contains `path` (longest matching mount prefix). */
export function ownerDrive(path: string, drives: Drive[]): Drive | undefined {
  let best: Drive | undefined;
  for (const d of drives) {
    const prefix = d.path.endsWith("/") ? d.path : `${d.path}/`;
    if (path === d.path || path.startsWith(prefix)) {
      if (!best || d.path.length > best.path.length) best = d;
    }
  }
  return best;
}

/**
 * Turn user-chosen folders into scan roots. Always `walk: true` — Spotlight's
 * per-subtree index is often incomplete (mdfind can silently return nothing for
 * an unindexed subfolder), and a bounded folder walk is fast and reliable. The
 * `indexed` flag is still inherited so last-opened enrichment can run when the
 * owning volume is indexed.
 */
export function foldersToRoots(folders: string[], drives: Drive[]): ScanRoot[] {
  return folders.map((path) => ({
    path,
    indexed: ownerDrive(path, drives)?.indexed ?? false,
    walk: true,
    isRoot: false,
  }));
}
