import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchAntonyms() {
  return SearchResults(SearchType.ANTONYM, "Search for antonyms");
}
