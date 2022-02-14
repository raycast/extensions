import { SearchType } from "./types";
import SearchResults from "./search-general-results";

export default function Search() {
  return SearchResults(SearchType.GENERAL);
}