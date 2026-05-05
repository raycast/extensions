import { useCachedPromise } from "@raycast/utils";
import { getLinks } from "../services/api";
import type { Link } from "../types";

/**
 * `useCachedPromise` workflow:
 *
 * 1. On initial call:
 *    1.1 Returns `initialData` (empty array)
 *    1.2 Sets `isLoading` to true
 *    1.3 Executes the async function to fetch data
 *    1.4 Caches the fetched data
 *    1.5 Updates the component state
 *
 * 2. On subsequent visits:
 *    2.1 Immediately returns the cached data
 *    2.2 Re-fetches new data in the background (stale-while-revalidate)
 *    2.3 Updates the cache and state upon receiving new data
 */
export function useLinks() {
  return useCachedPromise(
    // The async function to fetch data
    async () => {
      const links = await getLinks();
      return links;
    },
    // Dependencies array - empty because we don't have any dependencies
    [],
    {
      // Return initialData(empty array) when initial call
      initialData: [] as Link[],
    },
  );
}
