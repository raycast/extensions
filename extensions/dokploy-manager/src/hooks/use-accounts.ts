import { usePromise } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { getActiveAccount, listAccounts, setActiveAccountId } from "../accounts/storage";
import { DokployAccount } from "../accounts/types";
import { DokployClient } from "../api/client";

interface AccountsState {
  accounts: DokployAccount[];
  activeAccount?: DokployAccount;
}

/**
 * Loads the configured accounts and the one currently selected.
 *
 * Deliberately `usePromise` and not `useCachedPromise`: accounts carry API keys, and the cached
 * variant persists its result to Raycast's on-disk cache, which is not encrypted. Keys stay in
 * LocalStorage (encrypted) and in memory only.
 */
export function useAccounts() {
  const { data, isLoading, revalidate } = usePromise(async (): Promise<AccountsState> => {
    const [accounts, activeAccount] = await Promise.all([listAccounts(), getActiveAccount()]);
    return { accounts, activeAccount };
  }, []);

  const accounts = data?.accounts ?? [];
  const activeAccount = data?.activeAccount;

  const client = useMemo(() => (activeAccount ? new DokployClient(activeAccount) : undefined), [activeAccount]);

  const switchAccount = useCallback(
    async (accountId: string) => {
      await setActiveAccountId(accountId);
      revalidate();
    },
    [revalidate],
  );

  return {
    accounts,
    activeAccount,
    client,
    isLoading,
    switchAccount,
    reloadAccounts: revalidate,
    hasAccounts: accounts.length > 0,
  };
}
