// Raycast's built-in list filter only matches at the start of words, so "2" never finds "y2-s2".
// This module provides substring matching with ranking, meant to be used with `List filtering={false}`.

type Searchable = { primary: string; secondary?: string };

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function stripSeparators(text: string): string {
  return text.replace(/[^\p{L}\p{N}]/gu, "");
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

function countOccurrences(text: string, token: string): number {
  let count = 0;
  let from = 0;
  while (true) {
    const idx = text.indexOf(token, from);
    if (idx === -1) return count;
    count++;
    from = idx + token.length;
  }
}

// Higher is better, null means no match.
// Order of preference: exact > prefix > word start > substring (earlier is better) > separators ignored ("y1s1" -> "y1-s1").
function scoreToken(text: string, token: string): number | null {
  if (text === token) return 1000;

  const idx = text.indexOf(token);
  if (idx === -1) {
    return stripSeparators(text).includes(token) ? 100 : null;
  }

  const occurrences = Math.min(countOccurrences(text, token), 5);
  if (idx === 0) return 800 + occurrences;
  if (!isWordChar(text[idx - 1])) return 600 - Math.min(idx, 50) + occurrences;
  return 400 - Math.min(idx, 50) + occurrences;
}

function scoreItem(searchable: Searchable, tokens: string[]): number | null {
  const primary = normalize(searchable.primary);
  const secondary = searchable.secondary ? normalize(searchable.secondary) : undefined;
  let total = 0;

  for (const token of tokens) {
    const primaryScore = scoreToken(primary, token);
    const secondaryScore = secondary === undefined ? null : scoreToken(secondary, token);
    // A hit in the secondary text (e.g. the domain) counts for less than a hit in the title.
    const best = Math.max(primaryScore ?? -1, secondaryScore === null ? -1 : secondaryScore / 2);
    if (best < 0) return null;
    total += best;
  }

  return total;
}

export function rankByQuery<T>(items: T[], query: string, getSearchable: (item: T) => Searchable): T[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;

  return items
    .map((item, index) => ({ item, index, score: scoreItem(getSearchable(item), tokens) }))
    .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
