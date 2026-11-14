import type { Deck } from "./types";

/**
 * Ranked, token-based matching over everything we know about a deck.
 *
 * Raycast's built-in filtering only sees title and accessories, so the list
 * runs unfiltered and scores here instead — that is what makes slide *content*
 * searchable.
 */
const FIELDS: Array<{ weight: number; of: (deck: Deck) => string }> = [
  { weight: 100, of: (d) => d.title },
  { weight: 60, of: (d) => d.id },
  { weight: 40, of: (d) => d.theme ?? "" },
  { weight: 30, of: (d) => d.site.label },
  { weight: 20, of: (d) => (d.notes ?? []).filter(Boolean).join(" ") },
  { weight: 10, of: (d) => (d.text ?? []).join(" ") },
];

export type DeckMatch = {
  score: number;
  /** 1-based page the query matches best, so the deck can open right there. */
  page: number | null;
  /** The line that matched on that page. */
  excerpt: string | null;
};

/** The page whose copy covers the most query tokens. */
function bestPage(deck: Deck, tokens: string[]): { page: number; excerpt: string } | null {
  let best: { page: number; excerpt: string; hits: number } | null = null;

  (deck.pages ?? []).forEach((lines, index) => {
    const note = deck.notes?.[index] ?? "";
    const haystack = [...lines, note].join(" ").toLowerCase();
    const hits = tokens.filter((token) => haystack.includes(token)).length;
    if (hits === 0 || (best && hits <= best.hits)) return;

    // Prefer whatever actually matched: showing `lines[0]` for a hit that only
    // exists in the speaker note puts a line without the query on the row.
    const matches = (value: string) => tokens.some((token) => value.toLowerCase().includes(token));
    const line = lines.find(matches) ?? (matches(note) ? note : null) ?? lines[0] ?? note;
    best = { page: index + 1, excerpt: line, hits };
  });

  return best;
}

export function matchDeck(deck: Deck, query: string): DeckMatch | null {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { score: 0, page: null, excerpt: null };

  const haystacks = FIELDS.map((field) => ({
    weight: field.weight,
    value: field.of(deck).toLowerCase(),
  }));

  let score = 0;
  for (const token of tokens) {
    let best = 0;
    for (const { weight, value } of haystacks) {
      const at = value.indexOf(token);
      if (at === -1) continue;
      // Prefix hits rank above matches buried mid-string.
      best = Math.max(best, at === 0 ? weight * 2 : weight);
    }
    if (best === 0) return null;
    score += best;
  }

  const hit = bestPage(deck, tokens);
  return { score, page: hit?.page ?? null, excerpt: hit?.excerpt ?? null };
}
