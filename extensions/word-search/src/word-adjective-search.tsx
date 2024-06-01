import { SearchType } from "@/types";

import { useClipboardSetting } from "@/hooks/use-settings";

import SearchResults from "@/components/SearchResults";

export default function SearchAdjective() {
  const useClipboard = useClipboardSetting();
  return SearchResults(SearchType.ADJECTIVE, "Search for adjectives that describe a word", useClipboard);
}
