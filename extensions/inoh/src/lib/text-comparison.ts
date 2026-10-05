// How two pieces of text are told apart, everywhere one is matched against
// another.

/**
 * Folds text so two spellings of the same thing compare equal.
 *
 * Reason: one home for the rule. The suggestion service echoes a word back
 * and sometimes tidies its capitalization, the form keys a submission on the
 * word and definition it holds, and the hook remembers which words it has
 * asked about. All of them have to fold the same way, and a copy that dropped
 * the trim would not fail, it would quietly stop matching.
 *
 * @param text - A word or a definition, as typed, stored or echoed
 * @returns The form to compare on
 */
export function foldTextForComparison(text: string): string {
  return text.trim().toLowerCase();
}
