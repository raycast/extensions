import type { LaunchProps } from "@raycast/api";

import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";

export default function SearchAntonyms(props: LaunchProps) {
  return SearchResults(SearchType.ANTONYM, "Search for antonyms", props);
}
