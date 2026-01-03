import { useFrecencySorting } from "@raycast/utils";
import type { AliasEntry } from "../lib/aliasFiltering";

export function useAliasesWithFrecency(entries: AliasEntry[]) {
  const {
    data: sortedEntries,
    visitItem,
    resetRanking,
  } = useFrecencySorting(entries, {
    key: (entry) => entry[0],
    namespace: "alias-frecency",
  });

  return {
    sortedEntries,
    visitItem,
    resetRanking,
  };
}
