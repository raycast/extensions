export interface FuzzySearchable {
  title: string;
  description: string;
}

export interface FuzzySearchResult<T extends FuzzySearchable> {
  item: T;
  score: number;
}

const CONSTANTS = {
  MIN_SCORE_THRESHOLD: 0.15,
  TITLE_WEIGHT_MULTIPLIER: 1.5,
  CONSECUTIVE_MATCH_BONUS: 0.15,
  WORD_BOUNDARY_BONUS: 0.2,
} as const;

function normalizeStr(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "");
}

function fuzzyScore(needle: string, haystack: string): number {
  needle = normalizeStr(needle);
  haystack = normalizeStr(haystack);

  if (needle.length === 0) return 1;
  if (needle.length > haystack.length) return 0;

  let score = 0;
  let needleIdx = 0;
  let lastMatchIdx = -1;
  let consecutiveBonus = 0;

  for (let haystackIdx = 0; haystackIdx < haystack.length && needleIdx < needle.length; haystackIdx++) {
    if (haystack[haystackIdx] === needle[needleIdx]) {
      score += 1;

      // Bonus for consecutive matches
      if (lastMatchIdx !== -1 && haystackIdx === lastMatchIdx + 1) {
        consecutiveBonus += CONSTANTS.CONSECUTIVE_MATCH_BONUS;
      }

      // Bonus for matches at word boundaries
      if (haystackIdx === 0 || haystack[haystackIdx - 1] === " ") {
        score += CONSTANTS.WORD_BOUNDARY_BONUS;
      }

      lastMatchIdx = haystackIdx;
      needleIdx++;
    }
  }

  // Add consecutive bonus to score
  score += consecutiveBonus;

  // Only return a score if all characters were matched
  if (needleIdx === needle.length) {
    // Normalize score based on lengths
    return score / (haystack.length + needle.length * 0.5);
  }

  return 0;
}

export function fuzzySearch<T extends FuzzySearchable>(searchText: string, item: T): FuzzySearchResult<T> | null {
  const titleScore = fuzzyScore(searchText, item.title);
  const descriptionScore = fuzzyScore(searchText, item.description);

  // Weight title matches more heavily than description matches
  const totalScore = Math.max(titleScore * CONSTANTS.TITLE_WEIGHT_MULTIPLIER, descriptionScore);

  if (totalScore < CONSTANTS.MIN_SCORE_THRESHOLD) return null;

  return {
    item,
    score: totalScore,
  };
}

export function fuzzySearchList<T extends FuzzySearchable>(items: T[], searchText: string): T[] {
  if (!searchText.trim()) {
    return items.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
  }

  return items
    .map((item) => fuzzySearch(searchText, item))
    .filter((result): result is FuzzySearchResult<T> => result !== null)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.item);
}
