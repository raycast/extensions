/**
 * Drafts: a word written down but not asked for yet.
 *
 * A draft is a `card_requests` row at status `draft`, not local state, so a
 * word saved from Raycast is waiting in the web app a second later. It costs
 * nothing: it holds no slot in the monthly allowance and the generator never
 * sees it, because the poller only claims `pending` rows.
 *
 * A search miss writes the word down and stops there: it has no meaning yet,
 * and a card cannot be generated without one. Saying what it means and asking
 * for the card is the Generate command's job — see `card-request-generate`.
 */

import { supabase } from "./supabase";
import type { CardRequestDestination, SaveDraftResult } from "../types";

/**
 * Where a new card starts out, in both composers. A word saved from a search
 * miss lands under the control the user sees next; they switch it to Public
 * there if that is what they meant.
 */
export const INITIAL_DESTINATION: CardRequestDestination = "private";

/**
 * Names this client on every row it writes. A private request must carry one
 * (the database refuses it otherwise) and `publish_private_card` copies the
 * value onto the finished card.
 */
export const CARD_REQUEST_SOURCE = "raycast";

/** Matching a word ignores its case and any whitespace around it. */
function _normalizeWordForMatching(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * The draft this user already holds for a word, if any.
 *
 * Reason: drafts are exempt from the unique index on work in flight, so
 * nothing in the database stops the same word being written down twice.
 * Searching for a missing word and saving it again is the obvious way to do
 * that by accident, and typing a word into Generate that was saved from a
 * search miss earlier is the other.
 *
 * The comparison happens here rather than in the query because a word is
 * matched case-insensitively, and the `ilike` that would do that server-side
 * reads `%` and `_` in the user's own search text as wildcards. A user's
 * drafts are a short list; the word and the id are the only columns read.
 *
 * @param userId - Whose drafts to search
 * @param word - The word being written down or asked for
 * @returns The draft's id, or null when the word is not written down yet
 */
export async function findDraftIdForWord(userId: string, word: string): Promise<string | null> {
  // Reason: a failed read is not a reason to refuse the save. The worst a
  // missed duplicate costs is a second row the user can discard in the web
  // app, which is better than losing the word they just looked up.
  const { data: draftRows } = await supabase
    .from("card_requests")
    .select("id, word")
    .eq("user_id", userId)
    .eq("status", "draft");

  const normalizedWord = _normalizeWordForMatching(word);
  const matchingDraft = ((draftRows ?? []) as { id: string; word: string }[]).find(
    (draft) => _normalizeWordForMatching(draft.word) === normalizedWord,
  );

  return matchingDraft?.id ?? null;
}

/**
 * Writes a word down without asking for a card yet.
 *
 * The meaning is left blank on purpose: the database only requires one from
 * the moment a row leaves `draft`, so it is collected when the user says what
 * the card should teach rather than demanded at the search that missed.
 *
 * The word is normalized here rather than by callers: this module owns the
 * row, so it owns what actually gets stored, and the result carries the word
 * it wrote so a caller can name it without trimming a second time.
 *
 * @param userId - Authenticated user's ID
 * @param word - The word to write down, as the user typed it
 * @returns Whether it was saved, was already there, or could not be written
 */
export async function saveWordToDrafts(userId: string, word: string): Promise<SaveDraftResult> {
  const trimmedWord = word.trim();

  const existingDraftId = await findDraftIdForWord(userId, trimmedWord);
  if (existingDraftId !== null) {
    return { status: "already-saved", word: trimmedWord };
  }

  const { error } = await supabase.from("card_requests").insert({
    user_id: userId,
    word: trimmedWord,
    context: "",
    destination: INITIAL_DESTINATION,
    source: CARD_REQUEST_SOURCE,
    status: "draft",
  });

  if (error) {
    return { status: "failed", error: error.message };
  }

  return { status: "saved", word: trimmedWord };
}
