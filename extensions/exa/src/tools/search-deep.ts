import { searchDeepReasoning } from "../exa";
import { runHighlightSearch, type SearchQueryInput } from "./search-input";

/**
 * @returns Deep-reasoning search results with highlights and published dates when available.
 */
export default function (input: SearchQueryInput) {
  return runHighlightSearch(input, searchDeepReasoning);
}
