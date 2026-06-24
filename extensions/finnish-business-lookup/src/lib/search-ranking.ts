import type { UiCompany } from "../types/ui";

interface RankedCompany {
  company: UiCompany;
  index: number;
  score: number;
}

interface SearchField {
  value?: string;
  weight: number;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function getWords(value: string): string[] {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function scoreField(rawValue: string | undefined, query: string, queryWords: string[]): number {
  if (!rawValue) {
    return 0;
  }

  const value = normalizeSearchText(rawValue);
  if (!value) {
    return 0;
  }

  if (value === query) {
    return 10_000;
  }

  if (value.startsWith(query)) {
    return 8_000;
  }

  const words = value.split(" ");
  if (words.some((word) => word.startsWith(query))) {
    return 6_000;
  }

  if (queryWords.length > 1 && queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)))) {
    return 5_500;
  }

  const index = value.indexOf(query);
  if (index >= 0) {
    return 3_000 - Math.min(index, 500);
  }

  if (queryWords.length > 1 && queryWords.every((queryWord) => value.includes(queryWord))) {
    return 2_000;
  }

  return 0;
}

function getStatusScore(company: UiCompany): number {
  let score = 0;

  if (company.businessIdStatusCode === "2") {
    score += 250;
  }

  if (company.tradeRegisterStatusCode === "1") {
    score += 350;
  }

  if (company.tradeRegisterStatusCode === "4") {
    score -= 350;
  }

  if (company.endDate) {
    score -= 500;
  }

  score += Math.min(company.activeRegisterCount ?? 0, 10) * 10;

  return score;
}

function getSearchFields(company: UiCompany): SearchField[] {
  return [
    { value: company.currentLegalName, weight: 1.4 },
    { value: company.displayName, weight: 1.35 },
    { value: company.businessId, weight: 1.2 },
    ...company.alternateNames.map((value) => ({ value, weight: 0.9 })),
    ...company.previousLegalNames.map((value) => ({ value, weight: 0.55 })),
  ];
}

export function scoreCompanyForNameQuery(company: UiCompany, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return 0;
  }

  const queryWords = getWords(query);
  const matchScore = getSearchFields(company).reduce((bestScore, field) => {
    const fieldScore = scoreField(field.value, normalizedQuery, queryWords) * field.weight;
    return Math.max(bestScore, fieldScore);
  }, 0);

  return matchScore + getStatusScore(company);
}

export function rankCompaniesForNameQuery(companies: UiCompany[], query: string): UiCompany[] {
  return companies
    .map(
      (company, index): RankedCompany => ({
        company,
        index,
        score: scoreCompanyForNameQuery(company, query),
      }),
    )
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.index - right.index;
    })
    .map(({ company }) => company);
}
