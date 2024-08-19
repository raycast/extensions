import { useMemo } from "react";
import { URL, URLSearchParams } from "url";

import { Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { SimpleWord } from "@/types";
import { Vocabulary } from "@/types";

import { useCapitalizeResults, useMaxResults } from "@/hooks/use-settings";

const useSuggestions = (wordsToSearch: string, vocabulary?: Vocabulary) => {
  const capitalizeResults = useCapitalizeResults();
  const maxResults = useMaxResults();

  const url = useMemo(() => {
    const searchParams = new URLSearchParams({
      max: maxResults.toString(),
      s: wordsToSearch,
    });

    if (vocabulary && vocabulary !== Vocabulary.English) {
      searchParams.set("v", vocabulary);
    }

    return new URL(`/sug?${searchParams}`, "https://api.datamuse.com/sug").toString();
  }, [wordsToSearch, maxResults, vocabulary]);

  return useFetch<SimpleWord[]>(url, {
    parseResponse: async (response) => {
      if (!response.ok) {
        await showToast(
          Toast.Style.Failure,
          "Couldn't get results",
          "Word Search wasn't able to get results for this word.",
        );
        return [];
      }

      const words = (await response.json()) as SimpleWord[];

      words.forEach((word) => {
        if (capitalizeResults && wordsToSearch[0] === wordsToSearch[0].toUpperCase()) {
          word.word = word.word[0].toUpperCase() + word.word.slice(1);
        }
      });

      return words;
    },
    execute: wordsToSearch !== "",
  });
};

export default useSuggestions;
