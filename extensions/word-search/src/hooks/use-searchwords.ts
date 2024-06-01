import { useMemo } from "react";
import { URL, URLSearchParams } from "url";

import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { SearchType, Word } from "@/types";

const useSearchWords = (wordsToSearch: string, type: SearchType) => {
  const url = useMemo(() => {
    const searchParams = new URLSearchParams({
      language: "en",
      md: "d",
      max: "50",
      [type]: wordsToSearch,
    });

    return new URL(`/words?${searchParams}`, "https://api.datamuse.com/words").toString();
  }, [wordsToSearch, type]);

  const { capitalizeResults } = getPreferenceValues<Preferences>();

  return useFetch<Word[]>(url, {
    parseResponse: async (response) => {
      if (!response.ok) {
        await showToast(
          Toast.Style.Failure,
          "Couldn't get results",
          "Word Search wasn't able to get results for this word.",
        );
        return [];
      }

      const words = (await response.json()) as Word[];

      words.forEach((word) => {
        if (word.defs == undefined || !word.defs.length) {
          return;
        }

        if (capitalizeResults && wordsToSearch[0] === wordsToSearch[0].toUpperCase()) {
          word.word = word.word[0].toUpperCase() + word.word.slice(1);
        }

        for (let i = 0; i < word.defs.length; i++) {
          let definition: string = word.defs[i];
          definition = word.defs[i].replace(/\t/g, "~");
          word.defs[i] = definition.split("~")[1];
        }
      });

      return words;
    },
    execute: wordsToSearch !== "",
  });
};

export default useSearchWords;
