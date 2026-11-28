import { GENERATE_URL } from "../constants";

/**
 * What a word written down is still waiting for.
 *
 * Reason: said in two places, so worded in one. The toast that confirms the
 * save says it while it is on screen; the list says it after the toast has
 * faded, and the word is still in the search bar either way.
 *
 * @param word - The word that was written down
 * @returns The line naming the word and where its card is finished
 */
export function describeUnfinishedDraft(word: string): string {
  return `"${word}" · finish the card at ${GENERATE_URL}`;
}
