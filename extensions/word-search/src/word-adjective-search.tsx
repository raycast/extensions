import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchAdjective() {
  return SearchResults(SearchType.ADJECTIVE, "Search for adjectives that describe a word");
}
