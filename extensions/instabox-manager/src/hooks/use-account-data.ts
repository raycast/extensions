import { useCachedState, usePromise } from "@raycast/utils";
import { accountScope } from "../services/instabox";

/**
 * Loads data of the signed-in account and caches it like `useCachedPromise`, but per account (a hash of the API
 * URL and key), so cached data of one key or server is never shown for another. `key` names the data within
 * the account; calls with the same key share it.
 */
export function useAccountData<T>(key: string, fetch: () => Promise<T>, options: { onError?: (error: Error) => void }) {
  const [cached, setCached] = useCachedState<T | undefined>(key, undefined, { cacheNamespace: accountScope() });
  const result = usePromise(fetch, [], { onData: setCached, onError: options.onError });
  return { ...result, data: result.data ?? cached };
}
