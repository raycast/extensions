import {
  IndexCoverage,
  IndexStatus,
  describeCoverage,
  isReadyCoverage,
} from "./index-reader";

/** Everything the caveat line is allowed to look at. */
export type CaveatState = {
  /** Search scope; undefined searches all indexed locations. */
  dir?: string;
  /** The typed path bar, when one is active. */
  pathQuery?: { dir: string };
  indexStatus: IndexStatus;
  indexTooShort: boolean;
  coverage?: IndexCoverage;
  query: string;
  searchLimitReached: boolean;
  visibleFolderError?: string;
  locationError?: string;
  searchError?: string;
  omittedEntries: number;
  resultsTruncated: boolean;
};

/**
 * What the index can and cannot answer right now.
 *
 * A missing index is the ordinary state before the first build, so it is
 * reported as scope rather than as a failure: memory results still work.
 */
export function indexCaveat(state: CaveatState): string | undefined {
  if (state.dir !== undefined || state.pathQuery) return undefined;
  if (state.indexStatus === "failed")
    return "The search index could not be read — rebuild it from Actions";
  if (state.indexStatus === "missing" && state.query !== "")
    return "No search index yet — Rebuild Search Index in Actions";
  if (state.indexTooShort) return undefined;
  if (isReadyCoverage(state.coverage)) return describeCoverage(state.coverage);
  return undefined;
}

/**
 * The one explanation the status line shows, in priority order.
 *
 * Several things can be incomplete at once, so the order is the decision: the
 * first non-empty entry wins and the rest stay unsaid.
 */
export function describeCaveat(state: CaveatState): string | undefined {
  return [
    state.searchLimitReached &&
      "Search limit reached — narrow your query or search inside a folder",
    state.visibleFolderError && "this folder could not be read",
    state.locationError && "this location could not be read",
    state.searchError,
    indexCaveat(state),
    state.omittedEntries > 0 &&
      "Folder listing capped — some children were not read",
    state.resultsTruncated && "search reached a time, depth, or result limit",
  ].find((note): note is string => typeof note === "string" && note !== "");
}
