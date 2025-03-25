import type { LaunchProps } from "@raycast/api";

import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchRhyme(props: LaunchProps) {
  return SearchResults(SearchType.RHYME, "Search for rhymes", props);
}
