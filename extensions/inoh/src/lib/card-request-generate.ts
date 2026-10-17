import { supabase } from "./supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { describeCardRequestRefusal } from "./card-request-refusals";
import { CARD_REQUEST_SOURCE, findDraftIdForWord } from "./card-request-drafts";
import { findLikelyExistingCard } from "./existing-card-check";
import type { CardRequestDestination, RequestCardResult } from "../types";

/**
 * Asking for a card outright: a word, the sense it should teach, and which
 * dictionary it is headed for.
 *
 * Two writes rather than one. The row is written down as a draft and then
 * moved to `pending`, which is the same path the web app takes, because the
 * database's gates fire on leaving `draft`: the monthly allowance, today's
 * ceiling, and the unique index on work already in flight. A row that is
 * refused therefore stays a draft, waiting in both composers, instead of
 * vanishing with the words the user typed.
 */

/** A word written down but not asked for; the generator never sees these. */
const DRAFT_STATUS = "draft";

/** What became of a write aimed at a row that has to still be a draft. */
type DraftUpdateOutcome =
  | { changed: true }
  | { changed: false; reason: "draft-gone"; errorMessage: string }
  | { changed: false; reason: "rejected"; errorMessage: string; databaseError: PostgrestError };

/** What to say when the draft this was working on is no longer there. */
const DRAFT_GONE_MESSAGE = "That word is no longer waiting in your drafts. Try again.";

/** A row the generator can claim. The poller only ever looks at these. */
const PENDING_STATUS = "pending";

/**
 * Changes a row, but only while it is still a draft, and insists the change
 * landed on exactly one row.
 *
 * Reason: a draft is shared with the web app and the phone, so it can be
 * asked for or thrown away between reading it and writing to it. PostgREST
 * reports a write that matched nothing as a success, so the row is asked for
 * back and its absence is treated as the draft being gone.
 *
 * @param draftId - The draft to change
 * @param changes - The columns to set
 * @returns Whether one row changed, and if not, which of the two ways it
 *   failed: the database turned the write down, or there was no draft left to
 *   write to.
 */
async function _updateWhileStillDraft(draftId: string, changes: Record<string, string>): Promise<DraftUpdateOutcome> {
  const { data: changedDraft, error } = await supabase
    .from("card_requests")
    .update(changes)
    .eq("id", draftId)
    .eq("status", DRAFT_STATUS)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error !== null) return { changed: false, reason: "rejected", errorMessage: error.message, databaseError: error };
  if (changedDraft === null) return { changed: false, reason: "draft-gone", errorMessage: DRAFT_GONE_MESSAGE };
  return { changed: true };
}

/**
 * Writes the word down with its definition, reusing the draft already there.
 *
 * Reason: reused rather than inserted again, because the word may well have
 * been written down from a search miss already, and two drafts for one word
 * would leave the leftover sitting in the web app's composer.
 *
 * @param userId - Whose card this is
 * @param word - The word, already trimmed
 * @param definition - The sense its card should teach, already trimmed
 * @param destination - Which dictionary it is headed for
 * @returns The draft's id, or the error that stopped it being written down
 */
async function _writeDownWithDefinition(
  userId: string,
  word: string,
  definition: string,
  destination: CardRequestDestination,
): Promise<{ draftId: string } | { error: string }> {
  const existingDraftId = await findDraftIdForWord(userId, word);

  if (existingDraftId !== null) {
    const reuseResult = await _updateWhileStillDraft(existingDraftId, { context: definition, destination });
    return reuseResult.changed ? { draftId: existingDraftId } : { error: reuseResult.errorMessage };
  }

  const { data: insertedDraft, error } = await supabase
    .from("card_requests")
    .insert({
      user_id: userId,
      word,
      context: definition,
      destination,
      source: CARD_REQUEST_SOURCE,
      status: DRAFT_STATUS,
    })
    .select("id")
    .single<{ id: string }>();

  if (error !== null || insertedDraft === null) {
    return { error: error?.message ?? "The word could not be written down." };
  }

  return { draftId: insertedDraft.id };
}

/**
 * Asks Inoh to make the card for a word.
 *
 * @param userId - Authenticated user's ID
 * @param word - The word to make a card for, as the user typed it
 * @param definition - Which sense the card should teach
 * @param destination - Private for the user's own card, public to ask the
 *   shared dictionary for one
 * @param hasSaidGoAhead - Skip the already-have-this check, for a user who
 *   has read the card Inoh found and asked for theirs regardless
 * @returns Whether it is being made, is held pending the user, was refused, or
 *   could not be written
 */
export async function requestCard(
  userId: string,
  word: string,
  definition: string,
  destination: CardRequestDestination,
  hasSaidGoAhead = false,
): Promise<RequestCardResult> {
  const trimmedWord = word.trim();
  const trimmedDefinition = definition.trim();

  const draftWriteResult = await _writeDownWithDefinition(userId, trimmedWord, trimmedDefinition, destination);
  if ("error" in draftWriteResult) {
    return { status: "failed", error: draftWriteResult.error };
  }

  // Reason: checked after the word is written down and before it is asked
  // for, so a held word stays a draft. That is exactly where a refused word
  // ends up, and it is why the two writes above are two writes.
  if (!hasSaidGoAhead) {
    const likelyExisting = await findLikelyExistingCard(userId, trimmedWord, trimmedDefinition);
    if (likelyExisting !== null) {
      return { status: "held", word: trimmedWord, likelyExisting };
    }
  }

  const queueResult = await _updateWhileStillDraft(draftWriteResult.draftId, { status: PENDING_STATUS });

  if (queueResult.changed) {
    return { status: "queued", word: trimmedWord };
  }
  if (queueResult.reason === "draft-gone") {
    return { status: "failed", error: queueResult.errorMessage };
  }

  const refusal = describeCardRequestRefusal(queueResult.databaseError);
  return { status: "refused", word: trimmedWord, reason: refusal.message, isPlanLimit: refusal.isPlanLimit };
}
