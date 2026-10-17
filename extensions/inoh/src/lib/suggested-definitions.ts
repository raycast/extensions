// A first draft of what a word means, for the field that asks which sense a
// card should teach.
//
// Mirrored from the web app's `src/lib/suggested-definitions.ts` rather than
// shared, the same way `destination-copy` and `card-request-refusals` already
// are. There is no package between the two repos, and the field should fill
// itself in the same way wherever it is typed into.

import { supabase } from "./supabase";
import { foldTextForComparison } from "./text-comparison";

type DefinitionEntry = { word?: unknown; definition?: unknown };
type SuggestDefinitionsResponse = { definitions?: DefinitionEntry[] };

/** Whether one entry of the answer says what it is supposed to. */
function _isUsableEntry(entry: DefinitionEntry): entry is { word: string; definition: string } {
  return typeof entry?.word === "string" && typeof entry?.definition === "string";
}

/**
 * Whether the answer's echoed word is the one that was asked about.
 *
 * Reason: the model sometimes tidies the word's capitalization on the way
 * back, so the two are compared folded rather than literally.
 */
const _isSameWord = (echoedWord: string, askedWord: string): boolean =>
  foldTextForComparison(echoedWord) === foldTextForComparison(askedWord);

/** What came back when a definition was asked for. */
export type DefinitionSuggestionAnswer = {
  /** What the model wrote, when it had something to write. */
  definition?: string;
  /** Whether the service answered at all, which is not the same as having an answer. */
  hasServiceAnswered: boolean;
};

/** Nobody could be asked, so nothing is known about the word. */
const NO_ANSWER: DefinitionSuggestionAnswer = { hasServiceAnswered: false };

/**
 * A first draft of what one word means.
 *
 * Reason: never throws and never reports. A prefill is a convenience on top of
 * a field the user can always write themselves, so a refused, slow or
 * unconfigured service has to leave them exactly where they were rather than
 * put an error in front of a form they can still fill in. What it does say is
 * whether it got an answer, so the field can explain itself.
 *
 * The edge function takes a batch, and this keeps that array at its boundary:
 * one field asks about one word, and unwrapping a map of one at the call site
 * would only read as batching that is not happening.
 *
 * @param word - The word to define
 * @returns The definition, and whether the service answered
 */
export async function suggestDefinition(word: string): Promise<DefinitionSuggestionAnswer> {
  if (word.trim() === "") return NO_ANSWER;

  const { data: suggestionsResponse, error } = await supabase.functions.invoke<SuggestDefinitionsResponse>(
    "suggest-definitions",
    { body: { words: [word] } },
  );
  if (error !== null) return NO_ANSWER;

  const definitions = suggestionsResponse?.definitions ?? [];
  const matchingEntry = definitions.filter(_isUsableEntry).find((entry) => _isSameWord(entry.word, word));

  return { definition: matchingEntry?.definition.trim(), hasServiceAnswered: true };
}
