import type { FmhyResult } from "./types";

export type FmhySearchResults = {
  results: FmhyResult[];
  total: number;
};

export function searchFmhyResults(results: FmhyResult[], searchText: string, limit: number): FmhySearchResults {
  const tokens = normalizeSearchText(searchText).split(" ").filter(Boolean);
  const limitedResults: FmhyResult[] = [];
  let total = 0;

  for (const result of results) {
    if (tokens.length > 0 && !matchesSearch(result, tokens)) {
      continue;
    }

    total += 1;
    if (limitedResults.length < limit) {
      limitedResults.push(result);
    }
  }

  return {
    results: limitedResults,
    total,
  };
}

function matchesSearch(result: FmhyResult, tokens: string[]): boolean {
  const searchableText = [
    result.title,
    result.url,
    getHostname(result.url),
    result.category,
    result.categoryUrl,
    result.description,
    result.isStarred ? "starred recommended" : undefined,
    result.isRedirect ? "redirect category" : undefined,
    result.isIndex ? "index directory list" : undefined,
    ...(result.relatedLinks?.flatMap((link) => [link.title, link.url, link.group]) ?? []),
  ]
    .filter(isPresent)
    .map(normalizeSearchText)
    .join(" ");

  return tokens.every((token) => searchableText.includes(token));
}

function getHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function isPresent(value: string | undefined): value is string {
  return Boolean(value);
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase().trim();
}
