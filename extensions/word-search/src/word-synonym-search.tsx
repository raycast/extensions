import { SearchType } from "./types";
import SearchResults from "./search-results";

export default function SearchSynonym() {
  return SearchResults(SearchType.SYNONYM, "Search for synonyms");
}
