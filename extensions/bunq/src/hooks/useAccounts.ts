/**
 * Hook for fetching monetary accounts with session refresh handling
 */

import { usePromise } from "@raycast/utils";
import { getMonetaryAccounts, MonetaryAccount } from "../api/endpoints";
import { useBunqSession, withSessionRefresh } from "./useBunqSession";

export interface UseAccountsResult {
  accounts: MonetaryAccount[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
}

/**
 * Fetches monetary accounts for the current user
 */
export function useAccounts(session: ReturnType<typeof useBunqSession>): UseAccountsResult {
  const { data, isLoading, error, revalidate } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) {
        return [];
      }
      return withSessionRefresh(session, () => getMonetaryAccounts(session.userId!, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  return {
    accounts: data,
    isLoading,
    error,
    revalidate,
  };
}
