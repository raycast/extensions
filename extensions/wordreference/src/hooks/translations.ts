import { useEffect, useState } from "react";
import usePreferences from "./preferences";
import { useCachedState, useFetch } from "@raycast/utils";
import { Alert, Color, Icon, LocalStorage, Toast, confirmAlert, showToast } from "@raycast/api";
import { WordReferenceErrorResponse, wordReferenceRequestHeaders } from "../wordreference";

export function useSearchTranslations({ initialSearch = "" }: { initialSearch?: string }) {
  const [searchText, setSearchText] = useState(initialSearch);
  const { preferences } = usePreferences();

  const { data: response, isLoading } = useFetch<SearchTranslationsResponse>(
    `https://www.wordreference.com/autocomplete?dict=${preferences.translationKey}&query=${searchText.trim()}`,
    {
      method: "GET",
      headers: wordReferenceRequestHeaders,
      keepPreviousData: true,
      parseResponse: async (response) => {
        const body = await response.text();

        if (response.status >= 400) {
          return {
            type: "error",
            status: response.status,
            statusText: response.statusText,
          };
        }

        return {
          type: "success",
          data: parseSearchTranslations(body, searchText.trim()),
        };
      },
      execute: !!searchText.trim(),
    }
  );

  const data = response?.type === "success" ? response.data : [];
  const errorResponse = response?.type === "error" ? response : undefined;

  return { searchText, setSearchText, data, isLoading, errorResponse };
}

function getMatchRank(word: string, query: string): number {
  const wordLower = word.toLowerCase();
  const queryLower = query.toLowerCase();

  if (!queryLower) {
    return 0;
  }

  if (wordLower === queryLower) {
    return 0;
  }

  if (wordLower.startsWith(queryLower)) {
    return 1;
  }

  if (wordLower.includes(queryLower)) {
    return 2;
  }

  return 3;
}

function compareSearchResults(a: ParsedSearchResult, b: ParsedSearchResult, query: string): number {
  const queryLower = query.toLowerCase();
  const rankA = getMatchRank(a.word, queryLower);
  const rankB = getMatchRank(b.word, queryLower);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  const extraLengthA = a.word.length - queryLower.length;
  const extraLengthB = b.word.length - queryLower.length;

  if (extraLengthA !== extraLengthB) {
    return extraLengthA - extraLengthB;
  }

  if (a.popularity !== b.popularity) {
    return b.popularity - a.popularity;
  }

  return a.word.localeCompare(b.word);
}

function parseSearchTranslations(rawData: string, query: string): SearchTranslation[] {
  if (!rawData) {
    return [];
  }

  const results = rawData.split("\n").flatMap((line) => {
    const [word, lang, popularityValue] = line.split("\t").map((s) => s.trim());

    if (!word || !lang) {
      return [];
    }

    return [{ word, lang, popularity: Number(popularityValue) || 0 }];
  });

  return results.sort((a, b) => compareSearchResults(a, b, query)).map(({ word, lang }) => ({ word, lang }));
}

interface ParsedSearchResult {
  word: string;
  lang: string;
  popularity: number;
}

interface SearchTranslation {
  word: string;
  lang: string;
}

type SearchTranslationsResponse =
  | {
      type: "success";
      data: SearchTranslation[];
    }
  | WordReferenceErrorResponse;

interface RecentSearch {
  word: string;
  sourceLangKey: string;
  targetLangKey: string;
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useCachedState<RecentSearch[] | undefined>("recentSearches", undefined);

  async function loadRecentSearches() {
    const recentSearchesString = await LocalStorage.getItem<string>("recentSearches");
    if (recentSearchesString) {
      setRecentSearches(JSON.parse(recentSearchesString));
    } else {
      setRecentSearches([]);
    }
  }

  async function saveRecentSearches(searches: RecentSearch[]) {
    await LocalStorage.setItem("recentSearches", JSON.stringify(searches));
  }

  const addRecentSearch = ({ word, sourceLangKey, targetLangKey }: RecentSearch) => {
    const newRecentSearches =
      recentSearches?.filter(
        (recentSearch) =>
          recentSearch.word !== word ||
          recentSearch.sourceLangKey !== sourceLangKey ||
          recentSearch.targetLangKey !== targetLangKey
      ) || [];
    newRecentSearches.unshift({ word, sourceLangKey, targetLangKey });
    setRecentSearches(newRecentSearches);
    saveRecentSearches(newRecentSearches);
  };

  const removeRecentSearch = (index: number) => {
    const newRecentSearches = recentSearches ? [...recentSearches] : [];
    newRecentSearches.splice(index, 1);
    setRecentSearches(newRecentSearches);
    showToast({ title: "Successfully deleted", style: Toast.Style.Success });
    saveRecentSearches(newRecentSearches);
  };

  const clearRecentSearches = async () => {
    await confirmAlert({
      title: "Clear Recent Searches",
      message: "Are you sure you want to clear all recent searches?",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Clear",
        onAction: () => {
          setRecentSearches([]);
          saveRecentSearches([]);
          showToast({ title: "Successfully deleted", style: Toast.Style.Success });
        },
        style: Alert.ActionStyle.Destructive,
      },
    });
  };

  useEffect(() => {
    if (!recentSearches) loadRecentSearches();
  }, [recentSearches === undefined]);

  return { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches };
}
