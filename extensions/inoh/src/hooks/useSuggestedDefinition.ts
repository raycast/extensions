import { useEffect, useRef, useState } from "react";
import { NO_SUGGESTION, resolveMissingAnswerState, type DefinitionSuggestion } from "../lib/definition-suggestion";
import { suggestDefinition } from "../lib/suggested-definitions";
import { foldTextForComparison } from "../lib/text-comparison";

/**
 * How long to wait after the last keystroke in the word field before asking
 * what the word means.
 *
 * Reason: the word is typed a letter at a time, so asking on every change
 * would spend a request per letter on prefixes nobody meant.
 */
export const SUGGEST_AFTER_IDLE_MS = 500;

/**
 * A first draft of what one word means, for a field that is about to ask.
 *
 * Mirrors the web app's `useSuggestedDefinition`. Answering "which sense
 * should this card teach" from a standing start is what a search miss is
 * least ready for: the user came looking for the word because they do not
 * know it well. So the model answers first and they correct it.
 *
 * Whether to use the answer is the caller's to decide, not this hook's. It is
 * handed back rather than written anywhere, because it must never land over
 * something the user has written themselves.
 *
 * @param word - The word being asked about, as it is being typed
 * @param isSignedIn - Whether there is an account; the service refuses guests,
 *   and asking anyway would spend a round trip to be told so
 * @returns What the field was given, and how far it got
 */
export function useSuggestedDefinition(word: string, isSignedIn: boolean) {
  const [suggestion, setSuggestion] = useState<DefinitionSuggestion>(NO_SUGGESTION);

  /**
   * Which request the answer is awaited from.
   *
   * Reason: one form is used for word after word, so an answer that arrives
   * slowly would be about a word nobody is asking about any more. Only the
   * newest request may report back.
   */
  const activeRequestId = useRef(0);

  /**
   * The words answered for already.
   *
   * Reason: a user who deletes the suggestion is saying they want to write
   * their own, so the same word is never asked about twice.
   */
  const wordsAlreadyAskedAbout = useRef(new Set<string>());

  const askAboutWord = async (wordToAskAbout: string) => {
    const requestId = activeRequestId.current + 1;
    activeRequestId.current = requestId;

    setSuggestion({ state: "suggesting" });
    const answer = await suggestDefinition(wordToAskAbout);
    // Reason: a superseded answer leaves the state alone rather than settling
    // it, because whatever superseded it owns it now.
    if (requestId !== activeRequestId.current) return;

    if (answer.definition) {
      setSuggestion({ state: "suggested", definition: answer.definition });
      return;
    }

    setSuggestion({ state: resolveMissingAnswerState(answer.hasServiceAnswered) });
  };

  // Reason: read through a ref because it is rebuilt on every render, and
  // listing it as a dependency below would restart the idle timer each time
  // the form re-renders, so the suggestion would never be asked for.
  const latestAskAboutWord = useRef(askAboutWord);
  latestAskAboutWord.current = askAboutWord;

  useEffect(() => {
    // Reason: an old answer can arrive during the next word's debounce,
    // before its request starts. Invalidate it as soon as the input changes.
    activeRequestId.current += 1;
    setSuggestion(NO_SUGGESTION);

    const trimmedWord = word.trim();
    if (!isSignedIn || trimmedWord === "") return;

    const askedKey = foldTextForComparison(trimmedWord);
    if (wordsAlreadyAskedAbout.current.has(askedKey)) return;

    const timer = setTimeout(() => {
      wordsAlreadyAskedAbout.current.add(askedKey);
      void latestAskAboutWord.current(trimmedWord);
    }, SUGGEST_AFTER_IDLE_MS);

    return () => {
      clearTimeout(timer);
      // Reason: unmounting has no next effect to invalidate an in-flight answer.
      activeRequestId.current += 1;
    };
  }, [isSignedIn, word]);

  return suggestion;
}
