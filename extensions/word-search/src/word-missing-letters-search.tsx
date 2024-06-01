import { SearchType } from "@/types";

import { useClipboardSetting } from "@/hooks/use-settings";

import SearchResults from "@/components/SearchResults";

export default function SearchWordMissingLetters() {
  const useClipboard = useClipboardSetting<Preferences.WordMissingLettersSearch>();
  return SearchResults(
    SearchType.MISSING_LETTERS,
    "Search for words with missing letters",
    useClipboard,
    "Search for words by placing '?' between unknown letters",
    "Ex. 'sp??e' will search for words that start with 'sp' and end in 'e' with two unknown letters.",
  );
}
