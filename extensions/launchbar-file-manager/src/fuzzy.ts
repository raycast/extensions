/**
 * LaunchBar-style fuzzy matching for names.
 *
 * Three tiers (best first):
 *  1. exact substring — with bonuses for prefix / word-start / early hits
 *  2. subsequence abbreviations — "vsc" matches "Visual Studio Code",
 *     "qrn" matches "Quran"
 *  3. typo tolerance for queries of 4+ chars — transpositions and single
 *     wrong letters still match ("documnets" finds "documents")
 *
 * Returns a score (higher is better) or null when there is no match.
 * An empty query matches everything with score 0.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = target.toLowerCase();

  // 1. Exact substring fast path.
  const idx = t.indexOf(q);
  if (idx >= 0) {
    let s = 100;
    if (idx === 0) s += 30;
    else if (isSep(t[idx - 1])) s += 20;
    s -= idx;
    s -= (t.length - q.length) * 0.5;
    return s;
  }

  // 2. Subsequence abbreviation.
  const sub = subsequenceScore(q, t);
  if (sub !== null) return sub;

  // 3. Typo tolerance (Levenshtein on full name + word tokens).
  if (q.length >= 4) {
    const cap = q.length >= 6 ? 2 : 1;
    let best: number | null = null;
    const candidates = [t, ...t.split(/[\s._\-/]+/).filter(Boolean)];
    for (const c of candidates) {
      if (Math.abs(c.length - q.length) > cap + 2) continue;
      const d = levenshteinCapped(q, c, cap);
      if (d !== null && (best === null || d < best)) best = d;
    }
    if (best !== null) return 10 - best * 3 - t.length * 0.1;
  }

  return null;
}

export function fuzzyMatch(query: string, target: string): boolean {
  return fuzzyScore(query, target) !== null;
}

function isSep(ch: string): boolean {
  return (
    ch === " " ||
    ch === "." ||
    ch === "_" ||
    ch === "-" ||
    ch === "/" ||
    ch === "("
  );
}

/** Greedy left-to-right subsequence score, or null if any char is missing. */
function subsequenceScore(q: string, t: string): number | null {
  let score = 40;
  let ti = 0;
  let run = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) return null;
    if (found === 0) score += 15;
    else if (isSep(t[found - 1])) score += 10;
    if (found === ti) {
      run++;
      score += run * 4;
    } else {
      run = 0;
      score -= (found - ti) * 0.5;
    }
    ti = found + 1;
  }
  score -= (t.length - q.length) * 0.3;
  return score;
}

/** Levenshtein distance capped at `cap` (null when over). */
function levenshteinCapped(a: string, b: string, cap: number): number | null {
  if (a === b) return 0;
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > cap) return null;
    prev = cur;
  }
  return prev[b.length] <= cap ? prev[b.length] : null;
}
