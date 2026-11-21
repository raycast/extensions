import { getRandomValues } from "node:crypto";
import { adjectives, adverbs, nouns, verbs } from "./words";

export const MIN_WORDS = 3;
export const MAX_WORDS = 5;
export const DEFAULT_WORDS = 4;

// Length of each array minus one, lengths are powers of 2.
const ADJ = 511n;
const NOUN = 511n;
const VERB = 255n;
const ADV = 127n;

// Random words are drawn from the OS CSPRNG in bulk and handed out one at a
// time, so a call costs an array read instead of a syscall. Refilling is a
// fixed-size operation, so generation stays O(1).
const POOL_SIZE = 256;
const pool = new BigUint64Array(POOL_SIZE);
let cursor = POOL_SIZE;

function random64(): bigint {
  if (cursor === POOL_SIZE) {
    getRandomValues(pool);
    cursor = 0;
  }
  return pool[cursor++];
}

/**
 * Generate a kebab-cased, human-readable ID.
 */
export function humanId(wordCount: number = DEFAULT_WORDS): string {
  const r = random64();
  const adjective = adjectives[Number(r & ADJ)];
  const noun = nouns[Number((r >> 9n) & NOUN)];
  const verb = verbs[Number((r >> 18n) & VERB)];

  switch (wordCount) {
    case 3:
      return `${adjective}-${noun}-${verb}`;
    case 4:
      return `${adjective}-${noun}-${verb}-${adverbs[Number((r >> 26n) & ADV)]}`;
    case 5:
      return `${adjective}-${adjectives[Number((r >> 33n) & ADJ)]}-${noun}-${verb}-${adverbs[Number((r >> 26n) & ADV)]}`;
    default:
      throw new RangeError(`wordCount must be between ${MIN_WORDS} and ${MAX_WORDS}, got ${wordCount}`);
  }
}
