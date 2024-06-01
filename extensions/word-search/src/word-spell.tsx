import { SearchType } from "@/types";

import SearchResults from "@/components/SearchResults";
import {LaunchProps} from '@raycast/api';

export default function SearchSpelling(props: LaunchProps) {
  return SearchResults(SearchType.MISSING_LETTERS, "Spell a word", props);
}
