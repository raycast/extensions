// What the definition field makes of the suggestion written for it, and what
// it says about it.
//
// Mirrored from the web app's `src/lib/definition-suggestion.ts`, dots and
// all, so a wait reads the same wherever the field is typed into.

/** Where a field's suggested definition has got to. */
export type DefinitionSuggestionState =
  /** Nothing has been asked, so the field speaks for itself. */
  | "idle"
  /** A suggestion is on its way. */
  | "suggesting"
  /** One came back and is in the field. */
  | "suggested"
  /** The service answered, but had no definition for this word. */
  | "undefinable"
  /** The service could not be asked at all. */
  | "unavailable";

/** Everything the field knows about the definition suggested for its word. */
export type DefinitionSuggestion = {
  /** What was suggested, when something came back. */
  definition?: string;
  /** How far it got. */
  state: DefinitionSuggestionState;
};

/** A field nobody has asked about yet. */
export const NO_SUGGESTION: DefinitionSuggestion = { state: "idle" };

/**
 * The start of what the field says while its suggestion is on its way. Only a
 * placeholder once the moving dots are on the end of it, which is why it is
 * assembled below rather than used as it is.
 */
const SUGGESTING_PLACEHOLDER_PREFIX = "Suggesting a definition";

/**
 * Shown when there is no definition to be had for the word as written.
 *
 * Reason: names the spelling first. A word with no definition anywhere is
 * usually a typo, and the user is the only one who can tell.
 */
const UNDEFINABLE_PLACEHOLDER = "No definition found. Check the spelling, or write the sense you mean.";

/** Shown when the suggestion could not be asked for at all. */
const UNAVAILABLE_PLACEHOLDER = "Could not suggest one just now. Write the sense you mean.";

/** What the field says when its suggestion has nothing to add. */
const OWN_PLACEHOLDER = "Definition";

/** Marks a field still holding the suggestion it was given. */
export const SUGGESTED_DEFINITION_TAG = "Suggested";

/** The same thing where there is room for a sentence. */
export const SUGGESTED_DEFINITION_NOTE = "Change it if this is not the sense you want.";

/**
 * What an empty field says about its suggestion, if anything.
 *
 * @param state - Where the suggestion has got to
 * @param animatedDots - The dots trailing the waiting message, from
 *   useAnimatedEllipsis
 * @returns The placeholder to show
 */
export function describeSuggestionPlaceholder(state: DefinitionSuggestionState, animatedDots: string): string {
  if (state === "suggesting") return `${SUGGESTING_PLACEHOLDER_PREFIX}${animatedDots}`;
  if (state === "undefinable") return UNDEFINABLE_PLACEHOLDER;
  if (state === "unavailable") return UNAVAILABLE_PLACEHOLDER;
  return OWN_PLACEHOLDER;
}

/**
 * Whether a field still holds exactly the suggestion it was given.
 *
 * Reason: the marker comes off the moment a character changes. What is in the
 * field is then the user's, whatever it started as, and calling it a
 * suggestion would be putting words in their mouth.
 *
 * @param currentDefinition - What is in the field now
 * @param suggestedDefinition - What was suggested, if anything was
 * @returns True while the two are the same text
 */
export function isDefinitionStillSuggested(
  currentDefinition: string,
  suggestedDefinition: string | undefined,
): boolean {
  if (!suggestedDefinition) return false;
  return currentDefinition === suggestedDefinition;
}

/**
 * What a field that got no definition should say for itself.
 *
 * Reason: the two are not the same failure. A word nobody can define is the
 * user's to look at again, because it is usually a misspelling; a service that
 * could not be reached says nothing about the word.
 *
 * @param hasServiceAnswered - Whether the service answered at all
 * @returns The state the field is left in
 */
export function resolveMissingAnswerState(hasServiceAnswered: boolean): DefinitionSuggestionState {
  return hasServiceAnswered ? "undefinable" : "unavailable";
}
