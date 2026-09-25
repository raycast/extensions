import { useEffect, useRef, useState } from "react";
import { useAnimatedEllipsis } from "./useAnimatedEllipsis";
import { useSuggestedDefinition } from "./useSuggestedDefinition";
import { describeSuggestionPlaceholder, isDefinitionStillSuggested } from "../lib/definition-suggestion";

/**
 * The Generate form's definition field, which fills itself in.
 *
 * Reason: one place holding everything that makes this field different from a
 * plain text field — the suggestion on its way, the dots while it waits, what
 * the placeholder says in each state, and the rule that an answer never lands
 * over something the user has written. The form is left holding a value and a
 * setter, as it was before any of this existed.
 *
 * @param word - The word being defined, as it is being typed
 * @param isSignedIn - Whether there is an account; the service refuses guests
 * @returns The field's value and setter, the placeholder it should show
 *   while empty, and whether what is in it is still the suggestion it was given
 */
export function useDefinitionField(word: string, isSignedIn: boolean) {
  const [definition, setDefinition] = useState("");
  const suggestion = useSuggestedDefinition(word, isSignedIn);

  // Reason: only while the answer is actually on its way. Each step
  // re-renders the form, and there is no reason to keep doing that once the
  // field has something in it.
  const animatedDots = useAnimatedEllipsis(suggestion.state === "suggesting");

  // Reason: never over the user. They can out-type the suggestion, and the
  // one thing worse than an empty field is one that eats what was written.
  useEffect(() => {
    const suggestedDefinition = suggestion.definition;
    if (suggestedDefinition === undefined) return;
    setDefinition((currentDefinition) => (currentDefinition.trim() === "" ? suggestedDefinition : currentDefinition));
  }, [suggestion.definition]);

  // Reason: read through a ref so the effect below can see the latest answer
  // without depending on it. Depending on it would empty the field the moment
  // a suggestion landed in it.
  const latestSuggestedDefinition = useRef(suggestion.definition);
  latestSuggestedDefinition.current = suggestion.definition;

  // Reason: the word has moved on, so a suggestion nobody has touched is the
  // previous word's meaning and has to go. Left there it is not merely stale:
  // the effect above will not write over a field that has something in it, so
  // the new word's answer never lands and the card is made for one word with
  // another word's definition. Anything the user has edited is theirs and stays.
  useEffect(() => {
    setDefinition((currentDefinition) =>
      isDefinitionStillSuggested(currentDefinition, latestSuggestedDefinition.current) ? "" : currentDefinition,
    );
  }, [word]);

  return {
    definition,
    setDefinition,
    definitionPlaceholder: describeSuggestionPlaceholder(suggestion.state, animatedDots),
    /** True while the field still holds exactly what was suggested for it. */
    isStillSuggested: isDefinitionStillSuggested(definition, suggestion.definition),
  };
}
