import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { loadBetterAliasesAsync } from "../lib/betterAliases";
import { getLeaderKeyAliasesAsync } from "../lib/leaderKeyAliases";

export type FilterType = "all" | "snippets" | "aliases" | "leader-key";

export function useFilteredItems() {
  return useCachedPromise(
    async () => {
      const [leaderKey, all] = await Promise.all([getLeaderKeyAliasesAsync(), loadBetterAliasesAsync()]);
      const betterAliases = Object.fromEntries(Object.entries(all).filter(([, v]) => !v.snippetOnly));
      const snippets = Object.fromEntries(Object.entries(all).filter(([, v]) => v.snippetOnly));
      return { leaderKey, betterAliases, snippets };
    },
    [],
    { keepPreviousData: true, onError: (e) => void showFailureToast(e) },
  );
}
