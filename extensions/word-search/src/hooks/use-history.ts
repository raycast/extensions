import { useEffect } from "react";

import { useCachedState } from "@raycast/utils";

import type { Word } from "@/types";

import { useDisableHistory } from "@/hooks/use-settings";

const HISTORY_CACHE_KEY = "word-history";
const MAX_HISTORY_ITEMS = 200;

function useHistory() {
  const [history, setHistory] = useCachedState<Word[]>(HISTORY_CACHE_KEY, []);
  const disableHistory = useDisableHistory();

  useEffect(() => {
    if (disableHistory && history.length > 0) {
      setHistory([]);
    }
  }, [disableHistory, history, setHistory]);

  return {
    history: disableHistory ? [] : history,
    remove: (word: Word) => {
      if (disableHistory) return;
      setHistory((previous) => previous.filter((item) => item.word !== word.word));
    },
    add: (word: Word) => {
      if (disableHistory) return;
      setHistory((previous) =>
        [word, ...previous.filter((item) => item.word !== word.word)].slice(0, MAX_HISTORY_ITEMS),
      );
    },
    clear: () => setHistory([]),
  };
}

export default useHistory;
