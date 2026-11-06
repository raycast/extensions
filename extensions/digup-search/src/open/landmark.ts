import { escapeRegExp } from "../words";

/**
 * A word to search for in a PDF so that its page is among the matches: the longest of the query's words that's on
 * the page (three characters or more), spelled as the page spells it. DigUp's own `Landmark.find` prefers a word
 * that no earlier page has; the helper only hands over the page that matched, and a longer word is a rarer one.
 */
export function landmark(pageText: string, words: string[]): string | null {
  let best: string | null = null;
  for (const word of words) {
    if (word.length < 3 || (best !== null && word.length <= best.length)) continue;
    // A whole word where the script puts spaces between words ("cat", not the middle of "concatenate"); a piece
    // of a run where it doesn't, as in Chinese or Japanese.
    const spaced = /^[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{N}]+$/u.test(word);
    const pattern = spaced ? `(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])` : escapeRegExp(word);
    const match = new RegExp(pattern, "iu").exec(pageText);
    if (match) best = match[0];
  }
  return best;
}
