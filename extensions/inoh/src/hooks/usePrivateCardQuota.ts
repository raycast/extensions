import { usePromise } from "@raycast/utils";
import { fetchPrivateCardQuota } from "../lib/private-card-quota";

/**
 * Hook that tracks how much of the month's private card allowance is left.
 *
 * Takes whether anyone is signed in rather than who: the database function
 * answers for the authenticated caller, so there is no id to pass it.
 *
 * Reason: `usePromise` rather than the cached variant used elsewhere. With no
 * id to key a cache on, a cached tally could be shown to the next account to
 * sign in. The read is a single fast query, and it is re-read after every card
 * is asked for, because cards are also made on the web, on iOS, and by an AI
 * assistant.
 *
 * @param isSignedIn - Whether there is an account to read the allowance for
 */
export function usePrivateCardQuota(isSignedIn: boolean) {
  const { data: privateCardQuota, revalidate } = usePromise(fetchPrivateCardQuota, [], { execute: isSignedIn });

  return { privateCardQuota: privateCardQuota ?? null, revalidatePrivateCardQuota: revalidate };
}
