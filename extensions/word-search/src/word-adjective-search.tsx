import type { LaunchProps } from "@raycast/api";

import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchAdjective(props: LaunchProps) {
  return SearchResults(SearchType.ADJECTIVE, "Search for adjectives that describe a word", props);
}
