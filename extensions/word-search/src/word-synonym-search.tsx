import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchSynonym() {
  return SearchResults(SearchType.SYNONYM, "Search for synonyms");
}
