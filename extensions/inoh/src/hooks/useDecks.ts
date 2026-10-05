import { useCachedPromise } from "@raycast/utils";
import { fetchDecks } from "../lib/decks";

/**
 * Hook that fetches decks for the authenticated user.
 * Only executes when a valid userId is provided.
 */
export function useDecks(userId: string | null) {
  // Reason: the empty-string fallback is never fetched — `execute` gates the
  // call until a real userId exists. It only satisfies the argument type
  // without a non-null assertion.
  const { data, isLoading, error } = useCachedPromise(fetchDecks, [userId ?? ""], {
    execute: !!userId,
  });

  return { decks: data ?? [], isLoading, error };
}
