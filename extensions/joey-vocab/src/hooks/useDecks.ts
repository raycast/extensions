import { useCachedPromise } from "@raycast/utils";
import { supabase } from "../lib/supabase";
import type { Deck } from "../types";

/**
 * Fetches all decks for the given user.
 */
async function fetchDecks(userId: string): Promise<Deck[]> {
  const { data: deckRows, error } = await supabase
    .from("decks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch decks: ${error.message}`);
  }

  return (deckRows as Deck[]) || [];
}

/**
 * Hook that fetches decks for the authenticated user.
 * Only executes when a valid userId is provided.
 */
export function useDecks(userId: string | null) {
  const { data, isLoading, error } = useCachedPromise((id: string) => fetchDecks(id), [userId!], { execute: !!userId });

  return { decks: data ?? [], isLoading, error };
}
