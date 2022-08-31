import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import parse from "node-html-parser";
import { useRef } from "react";
import { fetch } from "undici";
import { iWord } from "../types";

export const getSaurusUrl = (word: string) => `https://www.thesaurus.com/browse/${encodeURIComponent(word)}`;

export const useThasaurus = (word: string) => {
  const abortable = useRef<AbortController>();

  const results = usePromise(
    async (word: string) => {
      word = word.trim();
      if (!word) return;
      try {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Loading...",
        });
        const html = await fetch(getSaurusUrl(word)).then((e) => e.text());
        const dom = parse(html);

        const script = dom.querySelectorAll("script").find((s) => s.innerText.includes("INITIAL_STATE"))?.innerText;
        const stateJSON = script
          ?.replace("window.INITIAL_STATE =", "")
          ?.replace(/;$/, "")
          ?.replace(/undefined/g, "null");
        const state = JSON.parse(stateJSON || "{}");
        const tunaApi = state?.searchData?.tunaApiData?.posTabs?.[0];
        const entry = state?.searchData?.tunaApiData?.entry;
        const exampleSentences = state?.searchData?.tunaApiData?.exampleSentences;
        // const relatedWords = state?.searchData?.relatedWordsApiData?.data;

        const { definition, pos, synonyms, antonyms } = tunaApi;
        // const relatedWords = state.searchData.relatedWordsApiData.data

        toast.hide();

        const processWord = (w: any): iWord => {
          return {
            similarity: Number(w.similarity),
            isInformal: w.isFormatl == "1",
            isVulgar: w.isVulgar == "1",
            term: w.term,
            targetTerm: w.targetTerm,
            targetSlug: w.targetSlug,
            definition: undefined,
          };
        };

        return {
          synonyms: synonyms.map(processWord),
          definition,
          pos,
          entry,
          antonyms: antonyms.map(processWord),
          exampleSentences: exampleSentences?.map((e: any): string => e.sentence) as string[],
        };
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Expression not found",
          message: "Please try again with an other word",
        });
      }
    },
    [word],
    {
      abortable,
      execute: !!word,
    }
  );

  return { ...results, isLoading: !!word && results.isLoading };
};
