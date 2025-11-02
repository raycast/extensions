/**
 * Helper functions for fuzzy matching
 */

import { MatchScore } from "../../types";

/**
 * Normalize separators (hyphens and underscores to spaces)
 */
export function normalizeSeparators(str: string): string {
  return str.replace(/[-_]/g, " ");
}

/**
 * Split string into words
 */
export function splitIntoWords(str: string): string[] {
  return str.split(/[\s-_]+/);
}

/**
 * Check for exact match
 */
export function checkExactMatch(target: string, query: string): MatchScore | null {
  if (target === query) {
    return { score: 100, reason: "exact" };
  }

  // Check exact match after separator normalization
  const targetNoSep = normalizeSeparators(target);
  const queryNoSep = normalizeSeparators(query);

  if (targetNoSep === queryNoSep) {
    return { score: 100, reason: "exact" };
  }

  return null;
}

/**
 * Check for word match
 */
export function checkWordMatch(target: string, query: string): MatchScore | null {
  const targetWords = splitIntoWords(target);
  const queryWords = splitIntoWords(normalizeSeparators(query));

  // Check if query is a complete word in target
  for (const word of targetWords) {
    if (word === query) {
      return { score: 100, reason: "exact" };
    }
  }

  // Check if all query words appear in target words
  if (queryWords.length > 1) {
    const allWordsMatch = queryWords.every((qw) => targetWords.some((tw) => tw.includes(qw)));
    if (allWordsMatch) {
      return { score: 85, reason: "prefix" };
    }
  }

  return null;
}

/**
 * Check for prefix match
 */
export function checkPrefixMatch(target: string, query: string): MatchScore | null {
  const targetWords = splitIntoWords(target);

  // String prefix match
  if (target.startsWith(query)) {
    const matchRatio = query.length / target.length;
    const score = 85 + matchRatio * 10; // 85-95 range
    return { score: Math.round(score), reason: "prefix" };
  }

  // Word prefix match
  for (const word of targetWords) {
    if (word.startsWith(query)) {
      const matchRatio = query.length / word.length;
      const score = 75 + matchRatio * 10; // 75-85 range
      return { score: Math.round(score), reason: "prefix" };
    }
  }

  return null;
}

/**
 * Check for contains match
 */
export function checkContainsMatch(target: string, query: string): MatchScore | null {
  if (target.includes(query)) {
    const matchRatio = query.length / target.length;
    const baseScore = matchRatio > 0.3 ? 55 : 40;
    const score = baseScore + matchRatio * 15; // 40-70 range
    return { score: Math.round(score), reason: "contains" };
  }

  return null;
}

/**
 * Check for acronym match
 */
export function checkAcronymMatch(target: string, query: string): MatchScore | null {
  const targetWords = splitIntoWords(target);
  const acronym = targetWords.map((w) => w[0]).join("");

  if (acronym.includes(query)) {
    return { score: 45, reason: "contains" };
  }

  return null;
}
