import { basename } from "node:path";
import { makeScopeFilter, type ScopeConfig } from "./filter";
import {
  IS_WINDOWS,
  isUnder,
  normalizeRoot,
  separatorFor,
  stripTrailingSep,
} from "./paths";
import type { SessionMeta } from "./types";

/**
 * Rendered dropdown entries, each re-serialized across the Raycast bridge on
 * every render. In-root projects rank first, so the cap only drops outlying
 * directories, which the `dir:` token still reaches.
 */
export const PROJECT_LIMIT = 50;

export interface ProjectOption {
  /** Absolute path; the filter matches it as a path prefix. */
  path: string;
  title: string;
  /** Most recent session in the project, which orders the list. */
  mtimeMs: number;
  /** Path segments below the search root, so the dropdown's search narrows. */
  keywords: string[];
}

/** How a project path is named wherever it is shown. */
export function projectTitle(path: string): string {
  return basename(path) || path;
}

/**
 * The directory that stands for a session's project. Worktrees and subdirectory
 * sessions must land on the repo the user thinks in, so this is the first level
 * under the search root: `~/code/pixie/.claude/worktrees/djinn` and
 * `~/code/pixie/backend/src` both become `~/code/pixie`, while `~/code/pixie-8ball`
 * stays its own project. A cwd outside the root, or any cwd when no root is
 * configured, has no such anchor, so it stands for itself.
 */
export function projectRoot(
  rawCwd: string,
  root: string,
  windows = IS_WINDOWS,
): string {
  // A trailing separator would make an otherwise identical cwd its own project.
  // Stripping one that is nothing but separators empties it: that cwd is the
  // filesystem root, which stands for itself like any other unanchored path.
  const cwd = stripTrailingSep(rawCwd, windows) || rawCwd.slice(0, 1);
  if (!root || cwd === root || !isUnder(cwd, root, windows)) return cwd;
  // Both sides were spelled with this separator at their entry boundary, so the
  // first one past the root is the end of the project's own segment.
  const sep = separatorFor(windows);
  const rest = cwd.slice(root.length + 1);
  const cut = rest.indexOf(sep);
  return cut === -1 ? cwd : root + sep + rest.slice(0, cut);
}

/** The projects worth offering in the search-bar dropdown. */
export function projectOptions(
  sessions: Iterable<SessionMeta>,
  config: ScopeConfig,
  windows = IS_WINDOWS,
): ProjectOption[] {
  // The same predicate the list uses, so the dropdown never offers a scope that
  // can only come back empty. Taking only the scope half keeps the offered
  // projects independent of the scope currently selected.
  const allow = makeScopeFilter(config, windows);
  const root = normalizeRoot(config.searchRoot, windows);
  const under = (path: string) =>
    Boolean(root) && path !== root && isUnder(path, root, windows);

  // Outside the root a cwd stands for itself, and those nest, so a repo and its
  // worktrees each claim an entry. Left distinct on purpose: with no root to
  // anchor against, nothing tells a project from a container, and folding each
  // entry into its shallowest ancestor collapsed the whole list into whatever
  // one session in the home directory had created.
  const mtimes = new Map<string, number>();
  for (const session of sessions) {
    if (!allow(session)) continue;
    const path = projectRoot(session.cwd, root, windows);
    // A session run at the search root belongs to no project: its prefix covers
    // every project under the root, so the entry would look like a scope while
    // behaving as "All Sessions".
    if (root && path === root) continue;
    const found = mtimes.get(path);
    if (found === undefined || session.mtimeMs > found)
      mtimes.set(path, session.mtimeMs);
  }

  return (
    // Ranked and capped before the entries are built: with `includeOutsideRoot`
    // on that discards several hundred candidates, and building them first would
    // split keywords out of their paths only to throw them away.
    [...mtimes]
      .map(([path, mtimeMs]) => ({ path, mtimeMs, inRoot: under(path) }))
      // In-root projects rank above outlying directories whatever their age:
      // with `includeOutsideRoot` on, worktrees and scratch dirs outnumber the
      // real repos several times over and would evict them.
      .sort(
        (a, b) => Number(b.inRoot) - Number(a.inRoot) || b.mtimeMs - a.mtimeMs,
      )
      .slice(0, PROJECT_LIMIT)
      .map(({ path, mtimeMs, inRoot }) => ({
        path,
        title: projectTitle(path),
        mtimeMs,
        // Segments every entry shares carry no signal: with the root's own
        // included, typing "code" under ~/code matches all of them.
        keywords: (inRoot ? path.slice(root.length + 1) : path)
          .split(separatorFor(windows))
          .filter(Boolean),
      }))
  );
}

/**
 * Whether two option lists would render identically. The corpus keeps growing
 * during an index while the projects in it settle almost at once, so this stops
 * a flush that changed nothing from re-rendering the whole command, as
 * `rowsEqual` does for the rows. Comparing paths is enough: title and keywords
 * derive from them.
 */
export function projectsEqual(a: ProjectOption[], b: ProjectOption[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].path !== b[i].path) return false;
  return true;
}
