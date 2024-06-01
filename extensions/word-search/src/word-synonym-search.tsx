import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";
import {LaunchProps} from '@raycast/api';

export default function SearchSynonym(props: LaunchProps) {
  return SearchResults(SearchType.SYNONYM, "Search for synonyms", props);
}
