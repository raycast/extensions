import { useCachedState } from "@raycast/utils";

import { Locale, useLanguage } from "./language";

export function useRecentArticles() {
  const [language] = useLanguage();
  const [readArticlesMap, setReadArticlesMap] = useCachedState<Partial<Record<Locale, string[]>>>("recentArticles");

  const articles = readArticlesMap?.[language] ?? [];

  return {
    readArticles: articles,
    addToReadArticles: (article: string) => {
      setReadArticlesMap((r) => ({
        ...r,
        [language]: [article, ...articles.filter((a) => a !== article)].slice(0, 20),
      }));
    },
  };
}
