import { useCachedState } from "@raycast/utils";

import { Word } from "@/types";

const HISTORY_CACHE_KEY = "word-history";
const MAX_HISTORY_ITEMS = 200;

function useHistory() {
  const [history, setHistory] = useCachedState<Word[]>(HISTORY_CACHE_KEY, []);

  return {
    history,
    remove: (word: Word) => setHistory((previous) => previous.filter((item) => item.word !== word.word)),
    edit: (word: Word) => setHistory((previous) => previous.map((item) => (item.word === word.word ? word : item))),
    add: (word: Word) =>
      setHistory((previous) =>
        [word, ...previous.filter((item) => item.word !== word.word)].slice(0, MAX_HISTORY_ITEMS),
      ),
    clear: () => setHistory([]),
  };
}

export default useHistory;
