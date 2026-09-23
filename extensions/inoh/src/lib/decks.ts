import { supabase } from "./supabase";
import type { Deck } from "../types";

/**
 * Fetches the account's decks in creation order.
 *
 * @param userId - The account whose decks to load
 * @returns The account's decks, oldest first
 * @throws {Error} When the deck query fails
 */
export async function fetchDecks(userId: string): Promise<Deck[]> {
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
