import type { Term } from "./utils/types";

export type SearchResult = Readonly<{
  terms: readonly Term[];
  totalMatchCount: number;
}>;

const termCollator = new Intl.Collator([], { sensitivity: "accent", usage: "sort" });
const searchCollator = new Intl.Collator("und", { sensitivity: "accent", usage: "search" });

const normalize = (value: string): string => {
  return value.normalize("NFC");
};

export const areTermsEquivalent = (left: string, right: string): boolean => {
  return searchCollator.compare(normalize(left), normalize(right)) === 0;
};

const termStartsWith = (term: string, query: string): boolean => {
  const normalizedTerm = normalize(term);
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length === 0) {
    return true;
  }

  for (let end = 0; end < normalizedTerm.length;) {
    const codePoint = normalizedTerm.codePointAt(end);
    end += typeof codePoint === "number" && codePoint > 0xffff ? 2 : 1;
    if (searchCollator.compare(normalizedTerm.slice(0, end), normalizedQuery) === 0) {
      return true;
    }
  }

  return false;
};

export const searchTerms = (terms: readonly Term[], query: string): SearchResult => {
  const normalizedQuery = query.trim();
  const matches = terms
    .filter(({ term }) => termStartsWith(term, normalizedQuery))
    .sort((left, right) => termCollator.compare(left.term, right.term));

  return Object.freeze({
    terms: Object.freeze(matches.slice(0, 5)),
    totalMatchCount: matches.length,
  });
};
