/** Card learning state — maps to FSRS State. Stored as postgres enum. */
export type CardState = "new" | "learning" | "review" | "relearning";

export type DictionaryEntry = {
  id: string;
  word: string;
  definition: string;
  example_sentence: string;
  image_path: string | null;
  word_audio_path: string | null;
  definition_audio_path: string | null;
  sentence_audio_path: string | null;
  word_distractors: string[] | null;
  definition_distractors: string[] | null;
  created_at: string;
  updated_at: string;
};

export type Deck = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type AddCardResult =
  | { success: true; cardId: string }
  | { success: false; error: string; isPlanLimit?: boolean };

export type RemoveCardResult = { success: true } | { success: false; error: string };

/**
 * What saving a searched-for word to the user's Inoh drafts did. "Already
 * saved" is a success: the word is waiting in the web app either way, and the
 * user is told so rather than being handed an error for repeating themselves.
 */
export type SaveDraftResult =
  | { status: "saved"; word: string }
  | { status: "already-saved"; word: string }
  | { status: "failed"; error: string };

/** Which dictionary a card request is headed for; mirrors `card_requests.destination`. */
export type CardRequestDestination = "private" | "public";

/**
 * What asking for a card did.
 *
 * A refusal carries the database's own words, because the gates it trips — the
 * monthly allowance, today's ceiling, a word already in flight — are the only
 * authority on why. The word stays written down as a draft either way, so a
 * refusal costs the user nothing they typed.
 */
export type RequestCardResult =
  | { status: "queued"; word: string }
  | { status: "refused"; word: string; reason: string; isPlanLimit: boolean }
  /**
   * Inoh looks to have this card already and is waiting to be told to go
   * ahead. Not a refusal: nothing turned the word down, and it is still
   * written down as a draft.
   */
  | { status: "held"; word: string; likelyExisting: LikelyExistingCard }
  | { status: "failed"; error: string };

/**
 * A card Inoh looks to have already, found when someone was about to ask for
 * it.
 *
 * Which dictionary it sits in changes what it means. A public entry was
 * matched on what the card teaches, and makes a public request pointless. One
 * of the user's own cards was matched on the word alone, because private cards
 * carry no embedding, so it is offered to read rather than as a verdict.
 */
export type LikelyExistingCard = {
  word: string;
  definition: string;
  foundIn: ExistingCardSource;
};

/** Which dictionary a likely duplicate was found in. */
export type ExistingCardSource = "publicDictionary" | "ownCards";

/**
 * What "Search Word from Screenshot" got out of a screen capture. Mirrors the
 * `ScreenOcrOutcome` struct in `swift/Sources/InohOcr/InohOcr.swift`.
 */
export type ScreenOcrOutcome =
  | { status: "recognized"; text: string }
  | { status: "cancelled" }
  | { status: "noTextFound" }
  | { status: "blankCapture" }
  | { status: "failed"; errorMessage: string };
