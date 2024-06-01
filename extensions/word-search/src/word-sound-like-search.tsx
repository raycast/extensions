import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";
import {LaunchProps} from '@raycast/api';

export default function SearchSynonym(props: LaunchProps) {
  return SearchResults(SearchType.SOUND_LIKE, "Search for words that sound like", props);
}
