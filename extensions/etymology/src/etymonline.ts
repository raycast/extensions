// Etymonline is a destination, not a source.
//
// It has no public API, and its entries are Douglas Harper's authored prose,
// declared proprietary with no open licence. So the extension points at them and
// reproduces nothing: a link costs the reader one keystroke and costs Etymonline
// a page view, which is the arrangement they are owed.
//
// Not under src/sources/ for that reason — nothing here fetches anything.

import { Entry } from "./model";

export function etymonlineUrl(term: string): string {
  return `https://www.etymonline.com/word/${encodeURIComponent(term)}`;
}

/**
 * The line at the foot of an entry.
 *
 * English only. Etymonline covers no other language, so on an ancestor like Old
 * English `wæter` the link would be a guaranteed dead end.
 */
export function etymonlineFooter(entry: Entry, enabled: boolean): string {
  if (!enabled || entry.lang !== "en") return "";
  // Not "Also on": a tree that names side branches already ends on "Also from
  // English -ic", and two Alsos in a row read as one list.
  return `Read more at [Etymonline](${etymonlineUrl(entry.term)})`;
}
