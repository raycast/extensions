import { useEffect, useState } from "react";
import usePreferences from "./preferences";
import { useCachedState, useFetch } from "@raycast/utils";
import { Alert, Color, Icon, LocalStorage, Toast, confirmAlert, showToast } from "@raycast/api";

export function useSearchTranslations({ initialSearch = "" }: { initialSearch?: string }) {
  const [searchText, setSearchText] = useState(initialSearch);

  const { preferences } = usePreferences();

  const { data, isLoading } = useFetch<{ word: string; lang: string }[]>(
    `https://www.wordreference.com/autocomplete?dict=${preferences.translationKey}&query=${searchText.trim()}`,
    {
      method: "GET",
      keepPreviousData: true,
      parseResponse: async (response) => {
        if (response.status >= 400) {
          return [];
        }
        const data = await response.text();
        if (!data || data.length === 0) {
          return [];
        }
        const lines = data.split("\n");
        const result = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const split = line.split("\t");
          if (split?.length < 2) {
            continue;
          }
          const [word, lang] = split.map((s) => s.trim());
          if (!word || !lang) {
            continue;
          }
          result.push({ word, lang });
        }
        return result;
      },
      execute: !!searchText.trim(),
    }
  );

  return { searchText, setSearchText, data: data, isLoading };
}

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
