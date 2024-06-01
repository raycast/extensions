import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";
import {LaunchProps} from '@raycast/api';

export default function SearchRhyme(props: LaunchProps) {
  return SearchResults(SearchType.RHYME, "Search for rhymes", props);
}
