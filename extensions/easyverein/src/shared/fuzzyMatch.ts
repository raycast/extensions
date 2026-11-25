const TRANSLITERATIONS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

/** Normalizes a text for comparing: lower case, umlauts transliterated, accents stripped. */
export function normalize(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => TRANSLITERATIONS[char])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Checks if two strings differ by at most one edit (insert, delete, substitute). */
export function withinOneEdit(first: string, second: string): boolean {
  if (Math.abs(first.length - second.length) > 1) {
    return false;
  }

  let firstIndex = 0;
  let secondIndex = 0;
  let edits = 0;

  while (firstIndex < first.length && secondIndex < second.length) {
    if (first[firstIndex] === second[secondIndex]) {
      firstIndex++;
      secondIndex++;
      continue;
    }
    if (++edits > 1) {
      return false;
    }
    if (first.length > second.length) {
      firstIndex++;
    } else if (first.length < second.length) {
      secondIndex++;
    } else {
      firstIndex++;
      secondIndex++;
    }
  }

  return edits + (first.length - firstIndex) + (second.length - secondIndex) <= 1;
}

/** Scores how well one normalized query token matches a normalized text, 0 to 100. */
export function scoreToken(token: string, text: string): number {
  if (!text) {
    return 0;
  }
  if (text === token) {
    return 100;
  }
  if (text.startsWith(token)) {
    return 80;
  }

  const words = text.split(" ");
  if (words.some((word) => word.startsWith(token))) {
    return 60;
  }
  if (text.includes(token)) {
    return 40;
  }
  if (
    token.length >= 4 &&
    words.some((word) => withinOneEdit(token, word.slice(0, token.length)))
  ) {
    return 20;
  }
  return 0;
}

/** Scores an item against the query; every token has to match the label or a keyword. */
export function scoreItem(query: string, item: { label: string; keywords?: string[] }): number {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (!tokens.length) {
    return 0;
  }

  const label = normalize(item.label);
  const keywords = (item.keywords ?? []).map(normalize);
  let total = 0;

  for (const token of tokens) {
    const best = Math.max(
      scoreToken(token, label),
      ...keywords.map((keyword) => scoreToken(token, keyword) * 0.7),
    );
    if (best === 0) {
      return 0;
    }
    total += best;
  }

  return total;
}

/** Filters and sorts items by how well they match the query, best first. */
export function filterItems<Item extends { label: string; keywords?: string[] }>(
  items: Item[],
  query: string,
  limit: number,
): Item[] {
  return items
    .map((item) => ({ item, score: scoreItem(query, item) }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
