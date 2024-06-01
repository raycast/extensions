import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchRhyme() {
  return SearchResults(SearchType.RHYME, "Search for rhymes");
}
