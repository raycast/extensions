import type { ParsedSearchFilters } from "./searchFilters";

// Cards tagged `secret` or `hidden` stay out of lists and searches until a
// search names one of those tags. Raycast can't import the workspace at
// publish time, so a test checks this list against Teak's own.
export const HIDDEN_TAGS = ["secret", "hidden"] as const;

export const HIDDEN_CARDS_HINT =
  "Some cards are hidden. Search #secret or #hidden to see them.";

export const hiddenAfterTaggingMessage = (tag: string): string =>
  `Hidden. Search #${tag.trim().toLowerCase()} to see it.`;

export const isHiddenTag = (tag: string | undefined): boolean =>
  HIDDEN_TAGS.some((hidden) => hidden === tag?.trim().toLowerCase());

export const hasHiddenTag = (tags: readonly string[]): boolean =>
  tags.some(isHiddenTag);

export const newlyHiddenTag = (
  before: readonly string[],
  after: readonly string[],
): string | null =>
  hasHiddenTag(before)
    ? null
    : (after.find(isHiddenTag)?.trim().toLowerCase() ?? null);

const queryWords = (filters: ParsedSearchFilters): string[] =>
  filters.query.toLowerCase().split(/\s+/).filter(Boolean);

export const searchNamesHiddenTag = (filters: ParsedSearchFilters): boolean =>
  isHiddenTag(filters.tag) ||
  queryWords(filters).some(
    (word) => word.startsWith("#") && isHiddenTag(word.slice(1)),
  );

export const shouldCheckForHiddenCards = (
  filters: ParsedSearchFilters,
): boolean =>
  !(filters.trashed || searchNamesHiddenTag(filters)) &&
  (!filters.rawQuery.trim() ||
    queryWords(filters).some((word) => isHiddenTag(word)));
