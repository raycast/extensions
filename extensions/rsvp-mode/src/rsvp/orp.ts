/**
 * Optimal Recognition Point — the focal letter the eye should fixate on.
 * Stepped heuristic from aaronpowell/speed-reader (MIT). Approximates ~30% into the word.
 */
export function orpIndex(word: string): number {
  const stripped = word.replace(/[^\p{L}\p{N}]/gu, "");
  const len = stripped.length;
  if (len <= 1) return 0;
  if (len <= 5) return Math.floor(len / 2) - 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

export function splitAtORP(word: string): { before: string; focus: string; after: string } {
  if (!word) return { before: "", focus: "", after: "" };
  const idx = orpIndex(word);
  let cursor = 0;
  let letterCount = 0;
  while (cursor < word.length && letterCount <= idx) {
    if (/[\p{L}\p{N}]/u.test(word[cursor])) {
      if (letterCount === idx) break;
      letterCount++;
    }
    cursor++;
  }
  if (cursor >= word.length) cursor = Math.max(0, word.length - 1);
  return {
    before: word.slice(0, cursor),
    focus: word[cursor] ?? "",
    after: word.slice(cursor + 1),
  };
}
