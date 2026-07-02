import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import type { FirefoxProfile, Suggestion } from "../types";
import { rankSuggestions } from "../services/suggestion-ranker";
import { queryFirefoxHistory } from "../services/firefox-history";
import { SUGGESTION_LIMIT } from "../constants";

export function useFirefoxSuggestions(profile: FirefoxProfile | null, term: string) {
  const history = useCachedPromise(
    async (p: FirefoxProfile | null, t: string) => {
      if (!p || !t.trim()) return [] as Suggestion[];
      const rows = await queryFirefoxHistory(p, t);
      return rankSuggestions(rows, t);
    },
    [profile, term],
    { keepPreviousData: true },
  );

  const suggestions = useMemo(() => (history.data ?? []).slice(0, SUGGESTION_LIMIT), [history.data]);

  return { isLoading: history.isLoading, suggestions, revalidate: history.revalidate };
}
