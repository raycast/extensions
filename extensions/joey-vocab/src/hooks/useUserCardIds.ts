import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { supabase } from "../lib/supabase";

/**
 * Fetches all dictionary IDs the user has already added as cards.
 * Returns a plain array (Sets don't survive useCachedPromise serialization).
 */
async function fetchUserCardDictionaryIds(userId: string): Promise<string[]> {
  const { data: cardRows, error } = await supabase.from("user_cards").select("dictionary_id").eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to fetch user cards: ${error.message}`);
  }

  return (cardRows ?? []).map((card) => card.dictionary_id);
}

/**
 * Hook that returns a Set of dictionary IDs already in the user's deck.
 * Only executes when a valid userId is provided.
 */
export function useUserCardIds(userId: string | null) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (id: string) => fetchUserCardDictionaryIds(id),
    [userId!],
    { execute: !!userId },
  );

  const userCardIds = useMemo(() => new Set(Array.isArray(data) ? data : []), [data]);

  return { userCardIds, isLoading, error, revalidate };
}
