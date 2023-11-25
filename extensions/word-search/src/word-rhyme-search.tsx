import { SearchType } from "./types";
import SearchResults from "./search-results";

export default function SearchRhyme() {
  return SearchResults(SearchType.RHYME, "Search for rhymes");
}
