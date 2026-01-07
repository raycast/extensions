import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getAccounts, Account } from "../api";
import { getRecentAccounts } from "../utils";

export function useAccounts() {
  return useCachedPromise(getAccounts, [], {
    keepPreviousData: true,
  });
}

export function useAccountsWithRecents() {
  const { data: accounts, isLoading, error } = useAccounts();
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [sortedAccounts, setSortedAccounts] = useState<Account[]>([]);

  useEffect(() => {
    getRecentAccounts()
      .then(setRecentIds)
      .catch(() => setRecentIds([]));
  }, []);

  useEffect(() => {
    if (!accounts) return;

    // Sort accounts: recent ones first, then alphabetically
    const recentSet = new Set(recentIds);
    const recentIndexMap = new Map(recentIds.map((id, index) => [id, index]));
    const recent: Account[] = [];
    const others: Account[] = [];

    for (const account of accounts) {
      if (recentSet.has(account.id)) {
        recent.push(account);
      } else {
        others.push(account);
      }
    }

    // Sort recent by their position in recentIds using O(1) Map lookup
    recent.sort((a, b) => (recentIndexMap.get(a.id) ?? 0) - (recentIndexMap.get(b.id) ?? 0));
    // Sort others alphabetically
    others.sort((a, b) => a.name.localeCompare(b.name));

    setSortedAccounts([...recent, ...others]);
  }, [accounts, recentIds]);

  return {
    data: sortedAccounts,
    recentIds,
    isLoading,
    error,
  };
}
