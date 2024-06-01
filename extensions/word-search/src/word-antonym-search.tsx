import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";
import {LaunchProps} from '@raycast/api';

export default function SearchAntonyms(props: LaunchProps) {
  return SearchResults(SearchType.ANTONYM, "Search for antonyms", props);
}
