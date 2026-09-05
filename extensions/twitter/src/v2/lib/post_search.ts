export interface SearchCandidate {
  fields: string[];
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function normalizeSearchTerms(terms: string[]): string[] {
  return [...new Set(terms.map((term) => normalize(term)).filter(Boolean))];
}

/** Returns a relevance score when every term matches, or undefined otherwise. */
export function scoreSearchCandidate(candidate: SearchCandidate, terms: string[]): number | undefined {
  const normalizedFields = candidate.fields.map((field) => normalize(field)).filter(Boolean);
  const searchableText = normalizedFields.join(" ");
  const compactText = searchableText.replaceAll(" ", "");
  let score = 0;

  for (const term of terms) {
    const compactTerm = term.replaceAll(" ", "");
    const phraseMatch = searchableText.includes(term);
    const compactMatch = compactTerm.length > 1 && compactText.includes(compactTerm);
    if (!phraseMatch && !compactMatch) return undefined;

    score += phraseMatch ? 2 : 1;
  }

  return score;
}
