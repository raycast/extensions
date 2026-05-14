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

export type AddCardResult = { success: true; cardId: string } | { success: false; error: string };

export type RequestCardSource = "search" | "list" | "add";

export interface RequestCardPayload {
  word: string;
  context: string;
  source?: RequestCardSource;
  user?: string;
}

export type RequestCardResult = { success: true } | { success: false; error: string };
