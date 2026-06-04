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
          data: parseSearchTranslations(body),
        };
      },
      execute: !!searchText.trim(),
    }
  );

  const data = response?.type === "success" ? response.data : [];
  const errorResponse = response?.type === "error" ? response : undefined;

  return { searchText, setSearchText, data, isLoading, errorResponse };
}

function parseSearchTranslations(rawData: string): SearchTranslation[] {
  if (!rawData) {
    return [];
  }

  return rawData.split("\n").flatMap((line) => {
    const [word, lang] = line.split("\t").map((s) => s.trim());

    if (!word || !lang) {
      return [];
    }

    return [{ word, lang }];
  });
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
