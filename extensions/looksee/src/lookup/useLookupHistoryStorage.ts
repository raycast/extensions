import { LookupResponse } from "../common/types/lookupResponse";
import { useEffect } from "react";
import { LookupHistoryItem } from "../common/types/lookupHistoryItem";
import { LocalStorage } from "@raycast/api";

import { getLookupStorageKey } from "./getLookupStorageKey";

/**
 * Hook that stores lookups in localStorage.
 * In addition to the lookup response itself metadata about the lookup is persisted.
 * Metadata: Address, Lookup timestamp, Success
 *
 * @param address address that the user is trying to lookup
 * @param isLoading if the application is waiting for the lookup API
 * @param data data returned by the lookup API
 */
export const useLookupHistoryStorage = (address: string, isLoading: boolean, data?: LookupResponse[]) => {
  useEffect(() => {
    if (isLoading) return;

    const historyItem: LookupHistoryItem = {
      address: address,
      lookupTimestamp: Date.now(),
      lookupResponse: data?.[0],
      success: !!data && data?.length > 0,
    };

    LocalStorage.setItem(getLookupStorageKey(address), JSON.stringify(historyItem));
  }, [isLoading, data]);
};
