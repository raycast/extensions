import { SearchType } from "./types";
import SearchResults from "./search-results";

export default function SearchWordMissingLetters() {
  return SearchResults(SearchType.MISSING_LETTERS, "Search for words by placing '?' between unknown letters");
}
