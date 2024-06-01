import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchSynonym() {
  return SearchResults(SearchType.SOUND_LIKE, "Search for words that sound like");
}
