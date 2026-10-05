import { compareNames } from "./name-order";
import { ScoreParts } from "./score";
import { Entry, SortMode } from "./types";

export type RankedEntry = {
  entry: Entry;
  tier: number;
  score: Pick<ScoreParts, "total">;
};

function compareNamesAndPaths(a: RankedEntry, b: RankedEntry) {
  return (
    compareNames(a.entry.name, b.entry.name) ||
    (a.entry.path < b.entry.path ? -1 : a.entry.path > b.entry.path ? 1 : 0)
  );
}

/** Orders explicit sorts globally and usage results by match quality first. */
export function compareRankedEntries(sortMode: SortMode) {
  return (a: RankedEntry, b: RankedEntry) => {
    switch (sortMode) {
      case "modified":
        return b.entry.mtimeMs - a.entry.mtimeMs || compareNamesAndPaths(a, b);
      case "created":
        return (
          b.entry.birthtimeMs - a.entry.birthtimeMs ||
          compareNamesAndPaths(a, b)
        );
      case "size":
        return b.entry.size - a.entry.size || compareNamesAndPaths(a, b);
      case "name":
        return compareNamesAndPaths(a, b);
      default:
        return (
          a.tier - b.tier ||
          b.score.total - a.score.total ||
          compareNamesAndPaths(a, b)
        );
    }
  };
}
