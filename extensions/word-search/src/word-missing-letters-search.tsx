import type { LaunchProps } from "@raycast/api";

import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchWordMissingLetters(props: LaunchProps) {
  return SearchResults(SearchType.MISSING_LETTERS, "Search for words with missing letters", props, {
    helperTitle: "Search for words by placing '?' between unknown letters",
    helperDescription:
      "Ex. 'sp??e' will search for words that start with 'sp' and end in 'e' with two unknown letters.",
  });
}
