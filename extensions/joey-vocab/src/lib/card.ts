import { createEmptyCard, State } from "ts-fsrs";
import { supabase } from "./supabase";
import type { DictionaryEntry, AddCardResult, RemoveCardResult, CardState } from "../types";

const POSTGRESQL_UNIQUE_VIOLATION = "23505";

/** Sentinel returned when the server-side trigger rejects an over-limit insert. */
export const PLAN_LIMIT_ERROR = "PLAN_LIMIT";

/**
 * Reason: the `enforce_free_card_limit` trigger raises an exception whose message
 * contains "FREE_CARD_LIMIT" when a free user exceeds the cap.
 */
function _isPlanLimitViolation(error: { message?: string }): boolean {
  return !!error.message?.includes("FREE_CARD_LIMIT");
}

/**
 * Reason: Supabase may return the violation as a postgres code or as a message string
 * depending on the client version and error context.
 */
function _isDuplicateViolation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === POSTGRESQL_UNIQUE_VIOLATION ||
    !!error.message?.includes("duplicate") ||
    !!error.message?.includes("unique")
  );
}

/**
 * Maps FSRS State enum to our CardState string type.
 */
function _fsrsStateToCardState(fsrsState: State): CardState {
  switch (fsrsState) {
    case State.New:
      return "new";
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
  }
}

/**
 * Creates the initial FSRS values for a brand-new card.
 * next_review is not set — it will be computed after the first review.
 */
function _createFsrsInitialState() {
  const card = createEmptyCard();
  return {
    stability: card.stability ?? 0,
    difficulty: card.difficulty,
    cardState: _fsrsStateToCardState(card.state),
  };
}

/**
 * Adds a dictionary entry to the user's deck.
 * Checks for duplicates, initializes FSRS state, and inserts the card.
 *
 * @param userId - Authenticated user's ID
 * @param entry - Dictionary entry to add
 * @param deckId - Target deck ID
 * @returns Result with success status, optional cardId, or error message
 */
export async function addCardToDeck(userId: string, entry: DictionaryEntry, deckId: string): Promise<AddCardResult> {
  // Check if card already exists in user's deck
  const { data: existingCard, error: checkError } = await supabase
    .from("user_cards")
    .select("id")
    .eq("user_id", userId)
    .eq("dictionary_id", entry.id)
    .maybeSingle();

  if (checkError) {
    return { success: false, error: "Failed to check if card already exists" };
  }

  if (existingCard) {
    return { success: false, error: "This card is already in your deck" };
  }

  // Seed FSRS defaults for new cards
  const { stability, difficulty, cardState } = _createFsrsInitialState();

  const { data: insertedCard, error: insertError } = await supabase
    .from("user_cards")
    .insert({
      user_id: userId,
      dictionary_id: entry.id,
      deck_id: deckId,
      stability,
      difficulty,
      card_state: cardState,
      review_count: 0,
      forget_count: 0,
    })
    .select("id")
    .single();

  if (insertError) {
    if (_isDuplicateViolation(insertError)) {
      return { success: false, error: "This card is already in your deck" };
    }

    if (_isPlanLimitViolation(insertError)) {
      return { success: false, error: PLAN_LIMIT_ERROR };
    }

    return { success: false, error: "Failed to add card to deck" };
  }

  if (!insertedCard?.id) {
    return { success: false, error: "Failed to add card to deck" };
  }

  return { success: true, cardId: insertedCard.id };
}

/**
 * Removes a card from the user's deck. Used to undo an accidental add.
 *
 * @param cardId - The user_cards row id returned by {@link addCardToDeck}
 * @returns Success, or failure with an error message
 */
export async function removeCardFromDeck(cardId: string): Promise<RemoveCardResult> {
  const { error } = await supabase.from("user_cards").delete().eq("id", cardId);

  if (error) {
    return { success: false, error: "Failed to remove card from deck" };
  }

  return { success: true };
}
