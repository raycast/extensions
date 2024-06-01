import { SearchType } from "@/types";

import { useClipboardSetting } from "@/hooks/use-settings";

import SearchResults from "@/components/SearchResults";

export default function SearchRhyme() {
  const useClipboard = useClipboardSetting<Preferences.WordRhymeSearch>();
  return SearchResults(SearchType.RHYME, "Search for rhymes", useClipboard);
}
