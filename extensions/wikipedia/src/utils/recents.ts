import { useCachedState } from "@raycast/utils";
import { useCallback } from "react";

import { Locale, useLanguage } from "./language";

export function useRecentArticles() {
  const [language] = useLanguage();
  const [readArticles, setReadArticles] = useCachedState<Partial<Record<Locale, string[]>>>("recentArticles");

  const addToReadArticles = useCallback(
    ({ title, language }: { title: string; language: Locale }) => {
      setReadArticles((r) => ({
        ...r,
        [language]: [title, ...(r?.[language] ?? []).filter((a) => a !== title)].slice(0, 20),
      }));
    },
    [setReadArticles],
  );

  const removeFromReadArticles = useCallback(
    ({ title, language }: { title: string; language: Locale }) => {
      setReadArticles((r) => ({
        ...r,
        [language]: (r?.[language] ?? []).filter((a) => a !== title),
      }));
    },
    [setReadArticles],
  );

  const clearReadArticles = useCallback(() => {
    setReadArticles({});
  }, [setReadArticles]);

  return {
    readArticles: readArticles?.[language] ?? [],
    addToReadArticles,
    removeFromReadArticles,
    clearReadArticles,
  };
}
