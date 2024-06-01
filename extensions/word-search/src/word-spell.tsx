import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchSpelling() {
  return SearchResults(SearchType.MISSING_LETTERS, "Spell a word");
}
