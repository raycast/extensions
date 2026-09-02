/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { QueryInput } from "@/types/query";

const MAX_TERM_LENGTH = 64;
const MAX_TERM_WORDS = 5;
const MAX_UNSPACED_TERM_LENGTH = 8;

export function isAIDictionaryCandidate(query: QueryInput): boolean {
  if (query.isWord !== undefined) return query.isWord;

  const source = query.word.trim();
  if (source.length === 0 || source.length > MAX_TERM_LENGTH || /[\r\n]/u.test(source)) return false;
  if (/^\p{N}+$/u.test(source)) return false;

  const terms = source.split(/\s+/u);
  if (terms.length > MAX_TERM_WORDS) return false;
  if (terms.length === 1 && /\p{Script=Han}/u.test(source) && Array.from(source).length > MAX_UNSPACED_TERM_LENGTH) {
    return false;
  }

  return terms.every((term) => /^[\p{L}\p{M}\p{N}]+(?:['’\-‐‑][\p{L}\p{M}\p{N}]+)*$/u.test(term));
}
