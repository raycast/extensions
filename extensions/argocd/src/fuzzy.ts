const SEPARATOR = /[-_./: ]/;

function isWordBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text[index - 1];
  const curr = text[index];
  if (SEPARATOR.test(prev)) return true;
  return /[a-z0-9]/.test(prev) && /[A-Z]/.test(curr);
}

/**
 * Scores how well `query` matches `text` as an ordered subsequence, favoring
 * matches at word boundaries (e.g. "mrp" matching "media-redaction-proxy")
 * and consecutive characters. Returns null when query isn't a subsequence.
 */
export function fuzzyScore(text: string, query: string): number | null {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  let score = 0;
  let tIndex = 0;
  let consecutive = 0;
  for (const ch of q) {
    const foundIndex = t.indexOf(ch, tIndex);
    if (foundIndex === -1) return null;

    if (foundIndex === tIndex) {
      consecutive++;
      score += 1 + consecutive * 2;
    } else {
      consecutive = 0;
      score += 1;
    }
    if (isWordBoundary(t, foundIndex)) score += 8;

    tIndex = foundIndex + 1;
  }
  return score - t.length * 0.01;
}

export function fuzzyFilterSort<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  const needle = query.trim();
  if (!needle) return items;

  const scored: Array<{ item: T; score: number }> = [];
  for (const item of items) {
    const score = fuzzyScore(getText(item), needle);
    if (score !== null) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}
