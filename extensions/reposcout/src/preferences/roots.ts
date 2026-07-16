import { expandHome } from "../utils/path";

/**
 * Pure helpers for managing the list of search-root folders that the user picks
 * inside the extension. No storage or Raycast access happens here so the
 * add/remove/merge/normalize rules are fully unit-testable. Persistence lives in
 * `roots-store.ts`; the folder-picker UI lives in `components/`.
 */

/**
 * Normalize a list of root paths: expand `~`, trim, drop blanks, and de-duplicate
 * while preserving first-seen order.
 *
 * @param roots Raw path strings (may contain `~`, whitespace, duplicates).
 * @param home  Home directory for `~` expansion (injectable for tests).
 */
export function normalizeRoots(roots: readonly string[], home?: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of roots) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const expanded = expandHome(trimmed, home);
    if (!seen.has(expanded)) {
      seen.add(expanded);
      result.push(expanded);
    }
  }
  return result;
}

/**
 * Add one or more candidate folders to an existing (already-normalized) list,
 * returning a new normalized list. Duplicates are ignored.
 */
export function addRoots(
  existing: readonly string[],
  candidates: readonly string[],
  home?: string,
): string[] {
  return normalizeRoots([...existing, ...candidates], home);
}

/**
 * Remove a folder from a list. The target is normalized before comparison so
 * `~/code` and its expanded form refer to the same entry.
 */
export function removeRoot(existing: readonly string[], target: string, home?: string): string[] {
  const normalizedTarget = expandHome(target.trim(), home);
  return normalizeRoots(existing, home).filter((root) => root !== normalizedTarget);
}

/**
 * Merge two normalized sources (e.g. preference roots + in-app roots) into one
 * de-duplicated list, preserving order with `primary` entries first.
 */
export function mergeRoots(primary: readonly string[], secondary: readonly string[]): string[] {
  return normalizeRoots([...primary, ...secondary]);
}
