import { useFrecencySorting } from "@raycast/utils";
import type { AliasEntry } from "../lib/aliasFiltering";
import { incrementUsage } from "../lib/usageStatsManager";

export function useAliasesWithFrecency(entries: AliasEntry[]) {
  const {
    data: sortedEntries,
    visitItem,
    resetRanking,
  } = useFrecencySorting(entries, {
    key: (entry) => entry[0],
    namespace: "alias-frecency",
  });

  // Wrap visitItem to also track usage stats
  const trackAndVisit = (entry: AliasEntry) => {
    incrementUsage(entry[0]); // Track usage count
    visitItem(entry); // Update frecency
  };

  return {
    sortedEntries,
    visitItem: trackAndVisit,
    resetRanking,
  };
}
