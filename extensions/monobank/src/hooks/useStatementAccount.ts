import { showFailureToast } from "@raycast/utils";
import { useEffect } from "react";
import { getSections } from "../components/AccountDropdown";
import { STATEMENT_SELECTION_TTL, STORAGE_KEYS } from "../data/constants";
import { AccountOrJar, AccountType } from "../types";
import { getDefaultItem, getItemTitle, isString } from "../utils";
import { useClientInfo } from "./useClientInfo";
import { usePinned } from "./usePinned";
import { useRecentValue } from "./useRecentValue";

/**
 * The account picked in the search bar of "Show Statement". ("Show Budgets" counts the budget accounts instead.)
 * `account` is `undefined` until it's known; render the dropdown only then, so it starts on it.
 */
export function useStatementAccount() {
  const {
    data: clientInfo,
    isLoading: isLoadingAccounts,
    isLoadingFromStorage: isLoadingCachedAccounts,
    isError,
    error,
    tokenError,
  } = useClientInfo();
  const {
    value: selectedId = "",
    setValue: setSelectedId,
    isLoading: isLoadingSelected,
  } = useRecentValue(STORAGE_KEYS.statementAccount, STATEMENT_SELECTION_TTL, isString);
  const pinned = usePinned<AccountOrJar>(STORAGE_KEYS.pinnedAccounts, getItemTitle);

  useEffect(() => {
    if (isError && !tokenError) {
      showFailureToast(error, { title: "Failed to load accounts" });
    }
  }, [isError, tokenError]);

  const cards = clientInfo.accounts.filter((account) => account.type !== AccountType.FOP);
  const fops = clientInfo.accounts.filter((account) => account.type === AccountType.FOP);
  const { jars } = clientInfo;
  const allItems: AccountOrJar[] = [...cards, ...fops, ...jars];

  // Every account loaded is a statement request, limited to one a minute. So nothing is picked until the saved
  // choice, the pins and the cached accounts are all read, and a default is never used in place of a saved
  // account that the accounts being fetched may still contain.
  function resolveAccount() {
    if (isLoadingSelected || pinned.isLoading || isLoadingCachedAccounts) return undefined;

    const selected = allItems.find((item) => item.id === selectedId);
    if (selected) return selected;
    if (selectedId && isLoadingAccounts) return undefined;

    return getDefaultItem(allItems, pinned.pinnedIds);
  }

  return {
    account: resolveAccount(),
    setAccountId: setSelectedId,
    sections: getSections({ cards, fops, jars, pinnedIds: pinned.pinnedIds }),
    isLoading: isLoadingAccounts || isLoadingSelected || pinned.isLoading,
    tokenError,
  };
}
