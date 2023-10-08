import { SearchType } from "./types";
import SearchResults from "./search-results";

export default function SearchWordMissingLetters() {
  return SearchResults(
    SearchType.MISSING_LETTERS,
    "Search for words with missing letters",
    "Search for words by placing '?' between unknown letters",
    "Ex. 'sp??e' will search for words that start with 'sp' and end in 'e' with two unknown letters."
  );
}
