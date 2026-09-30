import type { LaunchProps } from "@raycast/api";

import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchSpelling(props: LaunchProps) {
  return SearchResults(SearchType.MISSING_LETTERS, "Spell a word", props);
}
