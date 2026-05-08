import { SearchResult } from "./annas";

export type RankedSearchResult = SearchResult & {
  qualityScore: number;
  qualityReasons: string[];
};

export function rankResultsByFuzzyMatch(results: SearchResult[], query: string): RankedSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery || normalizedQuery.length < 2) {
    return results.map((result) => withQualityScore(result, query));
  }

  return results
    .map((result, index) => ({
      result: withQualityScore(result, query),
      index,
      score:
        scoreTextMatch(normalizeSearchText(resultToSearchText(result)), normalizedQuery) +
        scoreDownloadQuality(result, query),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ result }) => result);
}

function withQualityScore(result: SearchResult, query: string): RankedSearchResult {
  const quality = getDownloadQuality(result, query);
  return {
    ...result,
    qualityScore: quality.score,
    qualityReasons: quality.reasons,
  };
}

function resultToSearchText(result: SearchResult): string {
  return [result.title, result.author, result.year, result.language].filter(Boolean).join(" ");
}

function scoreDownloadQuality(result: SearchResult, query: string): number {
  return getDownloadQuality(result, query).score;
}

function getDownloadQuality(result: SearchResult, query: string): { score: number; reasons: string[] } {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTitle = normalizeSearchText(result.title);
  const normalizedAuthor = normalizeSearchText(result.author);
  const sizeMb = parseSizeInMb(result.size);
  const reasons: string[] = [];
  let score = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 80;
    reasons.push("exact title");
  } else if (normalizedTitle.startsWith(`${normalizedQuery} `) || normalizedTitle.startsWith(`${normalizedQuery}:`)) {
    score += 45;
    reasons.push("matching title");
  } else if (normalizedTitle.includes(normalizedQuery)) {
    score += 20;
  }

  if (normalizedAuthor && !normalizedAuthor.includes("translator") && !normalizedAuthor.includes("narrator")) {
    score += 10;
  }

  if (normalizedAuthor.split(" ").length > 3) {
    score -= 8;
  }

  if (/english \[en\]/i.test(result.language ?? "")) {
    score += 12;
    reasons.push("English");
  }

  if (/book \(fiction\)/i.test(result.contentType ?? "")) {
    score += 12;
    reasons.push("fiction");
  } else if (/book \(non-fiction\)/i.test(result.contentType ?? "")) {
    score -= 12;
  }

  if (typeof sizeMb === "number") {
    if (sizeMb >= 1.5 && sizeMb <= 8) {
      score += 14;
      reasons.push("normal EPUB size");
    } else if (sizeMb < 0.6) {
      score -= 8;
    } else if (sizeMb > 25) {
      score -= 10;
    }
  }

  if (/\b(?:saga|series|trilogy|book|vol|volume)\s*0?2\b/i.test(result.title)) {
    score -= 50;
    reasons.push("likely different series entry");
  }

  if (/\b(?:collection|boxed set|bundle|complete series|omnibus)\b/i.test(result.title)) {
    score -= 25;
  }

  return { score, reasons };
}

function scoreTextMatch(normalizedCandidate: string, normalizedQuery: string): number {
  if (!normalizedCandidate || !normalizedQuery) {
    return 0;
  }

  if (normalizedCandidate === normalizedQuery) {
    return 120;
  }

  let score = 0;

  if (normalizedCandidate.startsWith(normalizedQuery)) {
    score += 95;
  } else if (normalizedCandidate.includes(normalizedQuery)) {
    score += 75;
  } else if (isSubsequence(normalizedQuery, normalizedCandidate)) {
    score += 26;
  }

  const candidateTokens = normalizedCandidate.split(" ");
  const queryTokens = normalizedQuery.split(" ");

  for (const queryToken of queryTokens) {
    const bestTokenScore = Math.max(
      0,
      ...candidateTokens.map((candidateToken) => scoreTokenMatch(candidateToken, queryToken)),
    );
    score += bestTokenScore;
  }

  if (
    queryTokens.every((queryToken) => candidateTokens.some((candidateToken) => candidateToken.startsWith(queryToken)))
  ) {
    score += 18;
  }

  return score;
}

function parseSizeInMb(size: string | undefined): number | undefined {
  const match = size?.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)$/i);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "kb") {
    return value / 1024;
  }

  if (unit === "gb") {
    return value * 1024;
  }

  return value;
}

function scoreTokenMatch(candidateToken: string, queryToken: string): number {
  if (candidateToken === queryToken) {
    return 35;
  }

  if (candidateToken.startsWith(queryToken)) {
    return 28;
  }

  if (candidateToken.includes(queryToken)) {
    return 20;
  }

  if (queryToken.length >= 4 && levenshteinDistance(candidateToken, queryToken) <= 1) {
    return 18;
  }

  if (queryToken.length >= 5 && levenshteinDistance(candidateToken, queryToken) <= 2) {
    return 12;
  }

  return 0;
}

function normalizeSearchText(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSubsequence(needle: string, haystack: string): boolean {
  let needleIndex = 0;

  for (const character of haystack) {
    if (character === needle[needleIndex]) {
      needleIndex += 1;
    }
  }

  return needleIndex === needle.length;
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}
