import { SearchType } from "@/types";

import { useClipboardSetting } from "@/hooks/use-settings";

import SearchResults from "@/components/SearchResults";

export default function SearchSpelling() {
  const useClipboard = useClipboardSetting<Preferences.WordSpell>();
  return SearchResults(SearchType.MISSING_LETTERS, "Spell a word", useClipboard);
}
