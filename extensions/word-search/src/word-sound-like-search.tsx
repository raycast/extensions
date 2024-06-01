import type { LaunchProps } from "@raycast/api";

import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchSynonym(props: LaunchProps) {
  return SearchResults(SearchType.SOUND_LIKE, "Search for words that sound like", props, {
    useVocabulary: true,
  });
}
