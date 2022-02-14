import { SearchType } from "./types";
import SearchResults from "./search-dict-results";

export default function Search() {
  return SearchResults(SearchType.ENEN);
}
