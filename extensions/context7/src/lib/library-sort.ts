import { toTimestamp } from "./text";
import type { LibrarySummary } from "./types";

export type LibrarySort = "relevance" | "popularity" | "updated" | "trustScore" | "snippets";

export const LIBRARY_SORT_OPTIONS: Array<{ value: LibrarySort; title: string }> = [
  { value: "relevance", title: "Relevance" },
  { value: "popularity", title: "Popularity" },
  { value: "updated", title: "Recently Updated" },
  { value: "trustScore", title: "Trust Score" },
  { value: "snippets", title: "Most Snippets" },
];

/**
 * Context7 ranks search results with an LLM reranker whose order is not stable between
 * identical requests, so any ordering the user can rely on has to be applied here.
 * "relevance" deliberately preserves whatever the server returned.
 */
export function sortLibraries(libraries: LibrarySummary[], sort: LibrarySort) {
  if (sort === "relevance") {
    return libraries;
  }

  return [...libraries].sort((a, b) => compareBySort(a, b, sort));
}

function compareBySort(a: LibrarySummary, b: LibrarySummary, sort: LibrarySort) {
  switch (sort) {
    case "popularity":
      return toStars(b) - toStars(a);
    case "updated":
      return toTimestamp(b.lastUpdateDate) - toTimestamp(a.lastUpdateDate);
    case "trustScore":
      return (b.trustScore ?? 0) - (a.trustScore ?? 0);
    case "snippets":
      return (b.totalSnippets ?? 0) - (a.totalSnippets ?? 0);
    default:
      return 0;
  }
}

/**
 * Context7 reports `-1` stars for non-GitHub sources (llms.txt, websites). Sorting on the raw
 * value would rank every website below a zero-star repo, so unknown counts collapse to 0.
 */
function toStars(library: LibrarySummary) {
  const stars = library.stars;
  return typeof stars === "number" && stars >= 0 ? stars : 0;
}
