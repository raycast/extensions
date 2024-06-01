import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";
import { LaunchProps } from "@raycast/api";

export default function SearchAdjective(props: LaunchProps) {
  return SearchResults(SearchType.ADJECTIVE, "Search for adjectives that describe a word", props);
}
