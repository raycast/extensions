import { SearchType } from "./types";
import SearchResults from "./search-results";

export default function SearchAntonyms() {
  return SearchResults(SearchType.MISSING_LETTERS, "Spell a word");
}
