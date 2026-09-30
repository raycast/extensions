import { supabase } from "./supabase";
import { foldTextForComparison } from "./text-comparison";
import type { LikelyExistingCard } from "../types";

// Whether Inoh already has the card someone is about to ask for.
//
// Mirrored from the web app's `src/lib/existing-card-check.ts` rather than
// shared, the same way `destination-copy` and `card-request-refusals` already
// are. There is no package between the two repos, and a user who generates
// from Raycast and from the web should be told the same thing about the same
// word.

/**
 * How close a suggested card has to be to one Inoh already holds before we say
 * so. Mirrors SAME_CARD_SIMILARITY_THRESHOLD in the web app, which is where
 * the calibration that produced it lives; move them together or the two
 * surfaces start disagreeing about the same word.
 */
const SAME_CARD_SIMILARITY_THRESHOLD = 0.81;

/** Columns the notice needs to name a card and show what it teaches. */
const EXISTING_CARD_COLUMNS = "word, definition";

/**
 * Turns the word into the LIKE pattern that matches least besides itself.
 *
 * Reason: `ilike` reads `%` and `_` in the word as wildcards, so a card for
 * "100%" would otherwise answer for every card starting "100". An asterisk
 * reaches the database as `%` whatever is done to it here, since PostgREST
 * rewrites it on the way out, so it is sent as `_`: one character rather than
 * any number of them, which keeps the pattern from matching a word of another
 * length.
 *
 * @param word - The word being asked for, as typed
 * @returns A LIKE pattern matching the word, and at most words as long
 */
function _buildLikePatternForWord(word: string): string {
  const escapedWord = word.replace(/[\\%_]/g, "\\$&");
  return escapedWord.replace(/\*/g, "_");
}

type SenseMatch = { id: string; similarity: number };
type MatchSensesResponse = { matches?: Array<{ word: string; senses: SenseMatch[] }> };
type ExistingCardRow = { word: string; definition: string };

/**
 * The public dictionary's closest sense to the meaning given, if it is close
 * enough to be the same card.
 *
 * @param word - The word being asked for
 * @param meaning - The sense its card should teach
 * @returns The matching dictionary id, or null when nothing is close enough
 */
async function _findMatchingPublicSense(word: string, meaning: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("match-anki-senses", {
    body: { items: [{ word, context: meaning }] },
  });
  if (error !== null) return null;

  const matches = (data as MatchSensesResponse)?.matches ?? [];
  const [bestSense] = matches[0]?.senses ?? [];
  return bestSense && bestSense.similarity >= SAME_CARD_SIMILARITY_THRESHOLD ? bestSense.id : null;
}

/**
 * Reads one public dictionary card back, so the notice can show what it
 * teaches.
 *
 * @param dictionaryId - The card to read
 * @returns The card, or null when it could not be read
 */
async function _readDictionaryCard(dictionaryId: string): Promise<ExistingCardRow | null> {
  const { data, error } = await supabase
    .from("dictionary")
    .select(EXISTING_CARD_COLUMNS)
    .eq("id", dictionaryId)
    .maybeSingle<ExistingCardRow>();

  return error === null ? data : null;
}

/**
 * A card of the user's own carrying the same word.
 *
 * Reason: matched on the word rather than the meaning, because private cards
 * are published without an embedding and so have no vector to compare. Exact,
 * not a contains match, or "square away" would answer for "square".
 *
 * @param userId - Whose cards to look through
 * @param word - The word being asked for, already trimmed
 * @returns Their own card for that word, or null
 */
async function _findOwnCard(userId: string, word: string): Promise<ExistingCardRow | null> {
  const { data, error } = await supabase
    .from("dictionary")
    .select(EXISTING_CARD_COLUMNS)
    .eq("owner_user_id", userId)
    .ilike("word", _buildLikePatternForWord(word));

  if (error !== null) return null;

  // Reason: the narrowing above is still a pattern match, so the word itself
  // is what decides. Every row it matched is read, because the pattern cannot
  // match a word of another length and so cannot match many.
  const askedFor = foldTextForComparison(word);
  const candidates = (data as ExistingCardRow[]) ?? [];
  return candidates.find((candidate) => foldTextForComparison(candidate.word) === askedFor) ?? null;
}

/**
 * Looks for the card someone is about to ask for, in both dictionaries.
 *
 * Never throws. A rate-limited or failing check answers "nothing found", so a
 * flaky service costs somebody a warning rather than their card.
 *
 * @param userId - Whose private cards to include
 * @param word - The word to make a card for, already trimmed
 * @param meaning - The sense its card should teach
 * @returns The card Inoh looks to have already, or null
 */
export async function findLikelyExistingCard(
  userId: string,
  word: string,
  meaning: string,
): Promise<LikelyExistingCard | null> {
  try {
    const [publicSenseId, ownCard] = await Promise.all([
      _findMatchingPublicSense(word, meaning),
      _findOwnCard(userId, word),
    ]);

    // Reason: the shared dictionary is named first when both matched. It was
    // matched on what the card teaches rather than only on the word, so it is
    // the stronger claim and the one that makes a public request pointless.
    const publicCard = publicSenseId === null ? null : await _readDictionaryCard(publicSenseId);
    if (publicCard !== null) {
      return { word: publicCard.word, definition: publicCard.definition, foundIn: "publicDictionary" };
    }
    if (ownCard !== null) {
      return { word: ownCard.word, definition: ownCard.definition, foundIn: "ownCards" };
    }
    return null;
  } catch {
    return null;
  }
}
