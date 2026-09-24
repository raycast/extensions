import { searchHighlights } from "../exa";
import { runHighlightSearch, type SearchQueryInput } from "./search-input";

/**
 * @returns Compact search results with highlights and published dates when available.
 */
export default function (input: SearchQueryInput) {
  return runHighlightSearch(input, searchHighlights);
}
