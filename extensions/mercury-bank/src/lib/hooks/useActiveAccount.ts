import { usePromise } from "@raycast/utils";
import {
  getActiveAccount,
  getStoredAccounts,
  setActiveAccountId,
} from "../accounts";
import type { StoredAccount } from "../types";

export function useActiveAccount() {
  const {
    data: activeAccount,
    isLoading: isLoadingActive,
    revalidate: revalidateActive,
  } = usePromise(getActiveAccount);
  const {
    data: storedAccounts,
    isLoading: isLoadingAccounts,
    revalidate: revalidateAccounts,
  } = usePromise(getStoredAccounts);

  async function switchAccount(account: StoredAccount) {
    await setActiveAccountId(account.id);
    revalidateActive();
  }

  function revalidate() {
    revalidateActive();
    revalidateAccounts();
  }

  return {
    activeAccount: activeAccount ?? null,
    storedAccounts: storedAccounts ?? [],
    isLoading: isLoadingActive || isLoadingAccounts,
    switchAccount,
    revalidate,
  };
}