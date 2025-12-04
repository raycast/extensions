import { useMemo } from "react";
import { URL, URLSearchParams } from "url";

import { Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { SearchType, Word } from "@/types";
import { Vocabulary } from "@/types";

import { useCapitalizeResults, useMaxResults } from "@/hooks/use-settings";

const useSearchWords = (wordsToSearch: string, type: SearchType, vocabulary?: Vocabulary) => {
  const capitalizeResults = useCapitalizeResults();
  const maxResults = useMaxResults();

  const url = useMemo(() => {
    const searchParams = new URLSearchParams({
      md: "dp",
      max: maxResults.toString(),
      [type]: wordsToSearch,
    });

    if (vocabulary && vocabulary !== Vocabulary.English) {
      searchParams.set("v", vocabulary);
    }

    return new URL(`/words?${searchParams}`, "https://api.datamuse.com/words").toString();
  }, [wordsToSearch, type, maxResults, vocabulary]);

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
