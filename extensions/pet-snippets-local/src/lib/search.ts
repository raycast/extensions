import { PetSnippet } from "./pet";

export interface SearchResult {
  snippet: PetSnippet;
  textScore: number;
}

function parseQuery(query: string): {
  textQuery: string;
  tagFilters: string[];
} {
  const tagFilters: string[] = [];
  const textTokens: string[] = [];

  for (const token of query.trim().split(/\s+/).filter(Boolean)) {
    if (token.toLowerCase().startsWith("tag:")) {
      const value = token.slice(4).trim().toLowerCase();
      if (value) {
        tagFilters.push(value);
      }
      continue;
    }
    textTokens.push(token);
  }

  return { textQuery: textTokens.join(" ").trim().toLowerCase(), tagFilters };
}

function subsequenceScore(query: string, candidate: string): number {
  if (!query) {
    return 0;
  }

  let qIndex = 0;
  let streak = 0;
  let score = 0;
  for (let i = 0; i < candidate.length && qIndex < query.length; i++) {
    if (candidate[i] === query[qIndex]) {
      qIndex += 1;
      streak += 1;
      score += 5 + streak * 2;
    } else {
      streak = 0;
    }
  }

  return qIndex === query.length ? score : -1;
}

function scoreTextQuery(textQuery: string, candidate: string): number {
  if (!textQuery) {
    return 0;
  }

  const directMatch = candidate.indexOf(textQuery);
  if (directMatch >= 0) {
    return 10_000 - directMatch;
  }

  const tokens = textQuery.split(/\s+/).filter(Boolean);
  let tokenScore = 0;
  for (const token of tokens) {
    const matchIndex = candidate.indexOf(token);
    if (matchIndex === -1) {
      const fuzzy = subsequenceScore(token, candidate);
      if (fuzzy < 0) {
        return -1;
      }
      tokenScore += fuzzy;
    } else {
      tokenScore += 1_000 - matchIndex;
    }
  }
  return tokenScore;
}

function matchesTags(tags: string[], filters: string[]): boolean {
  if (filters.length === 0) {
    return true;
  }
  const set = new Set(tags.map((tag) => tag.toLowerCase()));
  return filters.every((filter) => set.has(filter));
}

export function filterAndSortSnippets(
  snippets: PetSnippet[],
  query: string,
  lastUsedMap: Record<string, number>,
): PetSnippet[] {
  const { textQuery, tagFilters } = parseQuery(query);

  const matches: SearchResult[] = [];
  for (const snippet of snippets) {
    if (!matchesTags(snippet.tags, tagFilters)) {
      continue;
    }

    const textScore = scoreTextQuery(textQuery, snippet.searchBlob);
    if (textScore < 0) {
      continue;
    }

    matches.push({ snippet, textScore });
  }

  matches.sort((a, b) => {
    if (textQuery && b.textScore !== a.textScore) {
      return b.textScore - a.textScore;
    }

    const lastUsedA = lastUsedMap[a.snippet.id] ?? 0;
    const lastUsedB = lastUsedMap[b.snippet.id] ?? 0;
    if (lastUsedB !== lastUsedA) {
      return lastUsedB - lastUsedA;
    }

    return a.snippet.description.localeCompare(b.snippet.description);
  });

  return matches.map((match) => match.snippet);
}
