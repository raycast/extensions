import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useMemo } from "react";
import { getTokenError, getTokenFingerprint } from "../api/monobank";
import { CLIENT_INFO_TTL, STORAGE_KEYS } from "../data/constants";
import { refreshClientInfo } from "../services/clientInfo";
import { Account, ClientInfo } from "../types";
import { getJarTitles } from "../utils/savings";
import { usePersistedResource } from "./usePersistedResource";

const initialValue: { clientInfo: ClientInfo } = {
  clientInfo: {
    accounts: [],
    jars: [],
  },
};

/** Every `useClientInfo` in the command, so a jar title one view learns reaches all of them (see `addJarTitles`). */
const jarTitleListeners = new Set<(titles: string[]) => void>();

/**
 * Adds the titles of jars that paid out (see `getPayoutJarTitles`) to the jar title history, e.g. from a statement a
 * sync just downloaded, so their earlier top-ups count as Savings without waiting for the next client info request.
 * The titles must come from statements stored for the token in the preferences.
 */
export function addJarTitles(titles: string[]) {
  if (titles.length) jarTitleListeners.forEach((listener) => listener(titles));
}

export function useClientInfo() {
  const { token } = getPreferenceValues<Preferences>();
  const tokenFingerprint = useMemo(() => getTokenFingerprint(token), [token]);

  const { data, setData, isLoading, isLoadingFromStorage, isError, error, revalidate } = usePersistedResource({
    key: STORAGE_KEYS.clientInfo,
    initialValue,
    ttl: CLIENT_INFO_TTL,
    // Data cached for another token (or before there was any) is never shown.
    scope: tokenFingerprint,
    // Moves or removes the stored data when the token changed (see `refreshClientInfo`).
    fetch: async () => ({ clientInfo: await refreshClientInfo(token) }),
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

  useEffect(() => {
    const listener = (titles: string[]) => {
      setData((prev) => {
        // Not added to a cache of another token, which isn't shown.
        if (prev.scope !== tokenFingerprint) return prev;
        const known = prev.clientInfo.jarTitleHistory?.titles ?? [];
        const added = titles.filter((title) => !known.includes(title));
        if (!added.length) return prev;
        return {
          ...prev,
          clientInfo: {
            ...prev.clientInfo,
            jarTitleHistory: { scope: tokenFingerprint, titles: [...known, ...added] },
          },
        };
      });
    };
    jarTitleListeners.add(listener);
    return () => {
      jarTitleListeners.delete(listener);
    };
  }, [setData, tokenFingerprint]);

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
    /** Requests the client info again now, e.g. to retry after it failed. */
    revalidate,
  };
}

/** The user's jar titles for `toTransaction`, so transfers to them are categorized as Savings. */
export function useJarTitles() {
  const { data } = useClientInfo();
  const { jars, jarTitleHistory } = data;
  return useMemo(() => getJarTitles({ accounts: [], jars, jarTitleHistory }), [jars, jarTitleHistory]);
}
