export interface SearchParameters {
  historyDisplayCount: number;
  bookmarkDisplayCount: number;
  topSuggestionsCount: number;
  enableConsecutiveSearch: boolean;
}

export const defaultSearchParameters: SearchParameters = {
  historyDisplayCount: 10,
  bookmarkDisplayCount: 10,
  topSuggestionsCount: 2,
  enableConsecutiveSearch: false,
};

export function parseSearchCount(
  value: string | number | undefined,
  fallback: number,
  max: number,
): number {
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return fallback;
  const count = Number(value);
  return Number.isInteger(count) && count > 0 ? Math.min(count, max) : fallback;
}

export const parseHistoryDisplayCount = (value: string | number | undefined) =>
  parseSearchCount(value, defaultSearchParameters.historyDisplayCount, 20);
export const parseBookmarkDisplayCount = (value: string | number | undefined) =>
  parseSearchCount(value, defaultSearchParameters.bookmarkDisplayCount, 20);
export const parseTopSuggestionsCount = (value: string | number | undefined) =>
  parseSearchCount(value, defaultSearchParameters.topSuggestionsCount, 10);

export function normalizeSearchParameters(
  value: Partial<SearchParameters> = {},
): SearchParameters {
  return {
    historyDisplayCount: parseHistoryDisplayCount(value.historyDisplayCount),
    bookmarkDisplayCount: parseBookmarkDisplayCount(value.bookmarkDisplayCount),
    topSuggestionsCount: parseTopSuggestionsCount(value.topSuggestionsCount),
    enableConsecutiveSearch: value.enableConsecutiveSearch === true,
  };
}
