function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export interface SearchValue {
  value?: string;
  weight?: number;
}

function getWords(value: string): string[] {
  return value.split(/[\s/.:?#&=_-]+/).filter(Boolean);
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getSearchableUrlParts(url: string): SearchValue[] {
  return [
    { value: getHostname(url), weight: 1.5 },
    { value: url, weight: 0.5 },
  ];
}

function getSubsequenceScore(value: string, term: string): number | null {
  let termIndex = 0;
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === term[termIndex]) {
      if (startIndex === -1) {
        startIndex = i;
      }
      endIndex = i;
      termIndex++;
    }

    if (termIndex === term.length) {
      const span = endIndex - startIndex + 1;
      const gaps = span - term.length;
      return Math.max(15, 58 - gaps * 5 - startIndex * 0.5);
    }
  }

  return null;
}

function getEditDistance(a: string, b: string): number {
  const distances = Array.from({ length: a.length + 1 }, (_, index) => index);

  for (let i = 1; i <= b.length; i++) {
    let previous = distances[0];
    distances[0] = i;

    for (let j = 1; j <= a.length; j++) {
      const current = distances[j];
      distances[j] = a[j - 1] === b[i - 1] ? previous : Math.min(previous + 1, distances[j] + 1, distances[j - 1] + 1);
      previous = current;
    }
  }

  return distances[a.length];
}

function getAcronym(words: string[]): string {
  return words.map((word) => word[0]).join("");
}

function getTermScore(value: string, term: string): number | null {
  const normalizedValue = normalizeSearchText(value);

  if (!normalizedValue) {
    return null;
  }

  const words = getWords(normalizedValue);
  const exactWordIndex = words.findIndex((word) => word === term);
  const prefixWordIndex = words.findIndex((word) => word.startsWith(term));
  const includesIndex = normalizedValue.indexOf(term);

  if (normalizedValue === term) {
    return 120;
  }

  if (normalizedValue.startsWith(term)) {
    return 105;
  }

  if (exactWordIndex !== -1) {
    return 95 - exactWordIndex;
  }

  if (prefixWordIndex !== -1) {
    return 85 - prefixWordIndex;
  }

  if (includesIndex !== -1) {
    return Math.max(60, 78 - includesIndex * 0.5);
  }

  const acronym = getAcronym(words);
  if (acronym.startsWith(term)) {
    return 70;
  }

  if (term.length >= 3) {
    const subsequenceScore = getSubsequenceScore(normalizedValue, term);
    if (subsequenceScore !== null) {
      return subsequenceScore;
    }
  }

  if (term.length >= 4) {
    const typoScore = words.reduce<number | null>((bestScore, word) => {
      if (Math.abs(word.length - term.length) > 2) {
        return bestScore;
      }

      const distance = getEditDistance(word, term);
      if (distance > 2) {
        return bestScore;
      }

      const score = 64 - distance * 10;
      return bestScore === null ? score : Math.max(bestScore, score);
    }, null);

    if (typoScore !== null) {
      return typoScore;
    }
  }

  return null;
}

export function getSearchScore(query: string, values: Array<string | SearchValue | undefined>): number | null {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return 0;
  }

  const searchableValues = values
    .map((value) => (typeof value === "string" ? { value } : value))
    .filter((value): value is SearchValue => Boolean(value?.value));

  let score = 0;

  for (const term of terms) {
    const bestTermScore = searchableValues.reduce<number | null>((bestScore, { value, weight = 1 }) => {
      const termScore = getTermScore(value ?? "", term);
      if (termScore === null) {
        return bestScore;
      }

      const weightedScore = termScore * weight;
      return bestScore === null ? weightedScore : Math.max(bestScore, weightedScore);
    }, null);

    if (bestTermScore === null) {
      return null;
    }

    score += bestTermScore;
  }

  return score;
}

export function matchesSearch(query: string, values: Array<string | SearchValue | undefined>): boolean {
  return getSearchScore(query, values) !== null;
}
