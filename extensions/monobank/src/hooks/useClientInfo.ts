import { getPreferenceValues } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { toClientInfo } from "../api/mappers";
import { getClientInfo, getTokenError, getTokenFingerprint } from "../api/monobank";
import { CLIENT_INFO_TTL, STORAGE_KEYS } from "../data/constants";
import { Account, ClientInfo } from "../types";
import { getJarTitles } from "../utils/savings";
import { usePersistedResource } from "./usePersistedResource";

const initialValue: { clientInfo: ClientInfo } = {
  clientInfo: {
    accounts: [],
    jars: [],
  },
};

export function useClientInfo() {
  const { token } = getPreferenceValues<Preferences>();
  const tokenFingerprint = useMemo(() => getTokenFingerprint(token), [token]);

  const { data, setData, isLoading, isLoadingFromStorage, isError, error } = usePersistedResource({
    key: STORAGE_KEYS.clientInfo,
    initialValue,
    ttl: CLIENT_INFO_TTL,
    // Data cached for another token (or before there was any) is never shown.
    scope: tokenFingerprint,
    fetch: async (previous) => ({
      clientInfo: toClientInfo(await getClientInfo(token), previous.clientInfo, tokenFingerprint),
    }),
    // A missing or rejected token isn't rate limited, so refetch as soon as the user fixes it.
    shouldRetryNextLaunch: (error) => getTokenError(error) !== undefined,
  });

  const updateAccount = useCallback(
    (id: string, patch: Partial<Account>) => {
      setData((prev) => ({
        ...prev,
        clientInfo: {
          ...prev.clientInfo,
          accounts: prev.clientInfo.accounts.map((account) => (account.id === id ? { ...account, ...patch } : account)),
        },
      }));
    },
    [setData],
  );

  const tokenError = getTokenError(error);

  return {
    // Without a token Monobank accepts, cached data can't be confirmed to belong to the user.
    data: tokenError ? initialValue.clientInfo : data.clientInfo,
    updateAccount,
    isLoading,
    /** Whether the cached accounts are still being read. Stays false while refetching. */
    isLoadingFromStorage,
    isError,
    error,
    tokenError,
  };
}

/** The user's jar titles for `toTransaction`, so transfers to them are categorized as Savings. */
export function useJarTitles() {
  const { data } = useClientInfo();
  const { jars, jarTitleHistory } = data;
  return useMemo(() => getJarTitles({ accounts: [], jars, jarTitleHistory }), [jars, jarTitleHistory]);
}
