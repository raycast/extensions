import type { Hit, Row } from "./types";

export interface LineScore {
  words: number;
  span: number;
}

/**
 * Sliding-window scratch, reused across calls: scoreLine runs over tens of
 * thousands of lines per keystroke, so a per-line allocation is worth avoiding.
 * Safe because the sweep below never yields.
 */
const cursor: number[] = [];
const cursorWord: number[] = [];

/**
 * Scores one corpus line against the query: how many distinct query words it
 * contains, and the tightest character span containing all of them. Words the
 * line lacks count for neither. Returns null when the line matches nothing.
 */
export function scoreLine(text: string, words: string[]): LineScore | null {
  const haystack = text.toLowerCase();
  let matched = 0;
  let firstAt = 0;
  let firstWord = 0;
  for (let i = 0; i < words.length; i++) {
    const at = haystack.indexOf(words[i]);
    if (at === -1) continue;
    // The first match stays in locals: most lines of the partial pass match one
    // word only, and filling the scratch for those measured ~30% of their cost.
    if (matched === 0) {
      firstAt = at;
      firstWord = i;
    } else {
      if (matched === 1) {
        cursor[0] = firstAt;
        cursorWord[0] = firstWord;
      }
      cursor[matched] = at;
      cursorWord[matched] = i;
    }
    matched++;
  }
  if (matched === 0) return null;
  // A lone word spans itself wherever it sits; skip the sweep, which would
  // otherwise walk every repeat of a very common word on every line.
  if (matched === 1) return { words: 1, span: words[firstWord].length };

  // Minimum window over the merged occurrence list: measure the window the
  // current occurrences span, then advance the leftmost one — the only move
  // that can tighten it — until that word runs out of occurrences.
  let best = Number.MAX_SAFE_INTEGER;
  for (;;) {
    let left = 0;
    let start = Number.MAX_SAFE_INTEGER;
    let end = 0;
    for (let i = 0; i < matched; i++) {
      const at = cursor[i];
      if (at < start) {
        start = at;
        left = i;
      }
      const stop = at + words[cursorWord[i]].length;
      if (stop > end) end = stop;
    }
    if (end - start < best) best = end - start;
    const next = haystack.indexOf(words[cursorWord[left]], start + 1);
    if (next === -1) return { words: matched, span: best };
    cursor[left] = next;
  }
}

/** True when `candidate` is a better representative line for a session than `current`. */
export function isBetterHit(
  candidate: LineScore,
  current: Hit | undefined,
): boolean {
  if (!current) return true;
  if (candidate.words !== current.words) return candidate.words > current.words;
  return candidate.span < current.span;
}

/**
 * Ranking: all-words sessions first, then the tightest match, then most recent.
 * Partial matches stay in the list — they just sort below.
 */
export function compareRows(a: Row, b: Row): number {
  const aw = a.hit?.words ?? 0;
  const bw = b.hit?.words ?? 0;
  if (aw !== bw) return bw - aw;
  const as = a.hit?.span ?? Number.MAX_SAFE_INTEGER;
  const bs = b.hit?.span ?? Number.MAX_SAFE_INTEGER;
  if (as !== bs) return as - bs;
  return b.session.mtimeMs - a.session.mtimeMs;
}
