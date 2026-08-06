import {
  IS_WINDOWS,
  isUnder,
  normalizeRoot,
  separatorFor,
  underDir,
} from "./paths";
import type { ParsedQuery } from "./query";
import type { Agent, SessionMeta } from "./types";

/** Where the command may look at all, independent of what is being searched. */
export interface ScopeConfig {
  searchRoot: string;
  ignore: string[];
  /** Set by the empty-state action that offers to look beyond the search root. */
  includeOutsideRoot: boolean;
}

export interface FilterConfig extends ScopeConfig {
  /** Search-bar dropdown; the `agent:` token in the query takes precedence. */
  agentOverride?: Agent;
  /**
   * Search-bar dropdown: absolute path of a project, matched as a path prefix.
   * Unlike the substring `dir:` token it keeps sibling repos that share a name
   * prefix apart (see `projects.ts`). The two compose: both must pass. Named for
   * the path to keep it distinct from `SessionMeta.project`, a bare directory
   * name that is never comparable to it.
   */
  projectPath?: string;
}

export function parseIgnoreList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The `agent:` token overrides the dropdown, so every caller decides it here. */
export function effectiveAgent(
  queryAgent: Agent | undefined,
  agentOverride: Agent | undefined,
): Agent | undefined {
  return queryAgent ?? agentOverride;
}

/**
 * The reachable corpus: the search root and the ignore list, with no reference
 * to the current query or scope selection. Split out so the project dropdown can
 * ask the same question without fabricating a query to ask it with.
 */
export function makeScopeFilter(
  config: ScopeConfig,
  windows = IS_WINDOWS,
): (session: SessionMeta) => boolean {
  const root = normalizeRoot(config.searchRoot, windows);
  // Built once here, not per line: see `underDir`.
  const inRoot = underDir(root, windows);
  // A cwd was spelled with this separator when it entered the manifest, so the
  // walk below finds every segment boundary there is; testing for the host's
  // `sep` instead matched nothing at all whenever the two disagreed, silently
  // disabling the entire Ignored Directories preference.
  const sep = separatorFor(windows);
  const ignore = new Set(config.ignore);
  // Segment lengths present in the ignore list. This predicate runs per corpus
  // line during ingest, where splitting a cwd allocated an array plus a string
  // per segment; checking the length first never materializes a segment that
  // could not match.
  const ignoreLengths = new Set([...ignore].map((name) => name.length));

  const hasIgnoredSegment = (cwd: string): boolean => {
    let start = 0;
    for (let i = 0; i <= cwd.length; i++) {
      if (i !== cwd.length && cwd[i] !== sep) continue;
      const length = i - start;
      if (
        length &&
        ignoreLengths.has(length) &&
        ignore.has(cwd.slice(start, i))
      )
        return true;
      start = i + 1;
    }
    return false;
  };

  return (session) => {
    if (!session.cwd) return false;
    if (!config.includeOutsideRoot && root && !inRoot(session.cwd))
      return false;
    if (ignore.size && hasIgnoredSegment(session.cwd)) return false;
    return true;
  };
}

export function makeFilter(
  query: ParsedQuery,
  config: FilterConfig,
  windows = IS_WINDOWS,
): (session: SessionMeta) => boolean {
  const inScope = makeScopeFilter(config, windows);
  const agent = effectiveAgent(query.agent, config.agentOverride);
  const projectPath = config.projectPath;
  const inProject = projectPath ? underDir(projectPath, windows) : undefined;

  return (session) => {
    if (!inScope(session)) return false;
    if (agent && session.agent !== agent) return false;
    if (inProject && !inProject(session.cwd)) return false;
    if (query.dirs.length) {
      const cwd = session.cwd.toLowerCase();
      if (!query.dirs.every((d) => cwd.includes(d))) return false;
    }
    return true;
  };
}

/** Everything that decides which sessions survive, flattened for comparison. */
export interface FilterState {
  /** Whitespace-joined query words; hits are scored against exactly these. */
  words: string;
  dirs: string[];
  agent?: Agent;
  projectPath?: string;
  includeOutsideRoot: boolean;
}

/**
 * Whether every session `next` admits was already admitted by `prev`, which lets
 * a filter change reuse the accumulated hits instead of re-sweeping the corpus.
 * Ingest skips scoring for sessions the filter rejects, so a widened filter has
 * nothing stored to re-select from and must start over; a narrowed one only ever
 * drops rows that are still in hand.
 *
 * Conservative by design: every dimension must prove it did not widen, and
 * anything unrecognized answers false. Being wrong that way costs a redundant
 * sweep; being wrong the other way silently hides results.
 */
export function narrows(
  prev: FilterState,
  next: FilterState,
  windows = IS_WINDOWS,
): boolean {
  // Hits are keyed to the word set that found them; any change invalidates all.
  if (prev.words !== next.words) return false;
  // Setting an agent narrows; clearing or swapping one does not.
  if (next.agent !== prev.agent && prev.agent !== undefined) return false;
  // Selecting a project narrows, as does moving to one inside it.
  if (
    next.projectPath !== prev.projectPath &&
    prev.projectPath !== undefined &&
    !(
      next.projectPath !== undefined &&
      isUnder(next.projectPath, prev.projectPath, windows)
    )
  )
    return false;
  // Reaching outside the search root only ever adds sessions.
  if (next.includeOutsideRoot && !prev.includeOutsideRoot) return false;
  // Each `dir:` is a required substring, so keeping them all and adding more
  // narrows; dropping one admits sessions that were never scored.
  return prev.dirs.every((dir) => next.dirs.includes(dir));
}
