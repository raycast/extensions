import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { loadBetterAliasesAsync } from "../lib/betterAliases";

export function useSnippetsOnly() {
  const result = useCachedPromise(
    async () => {
      const all = await loadBetterAliasesAsync();
      return Object.fromEntries(Object.entries(all).filter(([, v]) => v.snippetOnly));
    },
    [],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Failed to load snippets" });
      },
    },
  );

  return result;
}
