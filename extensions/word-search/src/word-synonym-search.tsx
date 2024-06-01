import { SearchType } from "@/types";

import { useClipboardSetting } from "@/hooks/use-settings";

import SearchResults from "@/components/SearchResults";

export default function SearchSynonym() {
  const useClipboard = useClipboardSetting<Preferences.WordSynonymSearch>();
  return SearchResults(SearchType.SYNONYM, "Search for synonyms", useClipboard);
}
