import { SearchType } from "./types";
import SearchResults from "./search-results";

export default function SearchRhyme() {
  return SearchResults(SearchType.ADJECTIVE, "Search for adjectives that describe a word");
}
