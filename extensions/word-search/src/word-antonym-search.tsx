import { SearchType } from "@/types";

import { useClipboardSetting } from "@/hooks/use-settings";

import SearchResults from "@/components/SearchResults";

export default function SearchAntonyms() {
  const useClipboard = useClipboardSetting<Preferences.WordAntonymSearch>();
  return SearchResults(SearchType.ANTONYM, "Search for antonyms", useClipboard);
}
