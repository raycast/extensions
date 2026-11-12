/** Keyword validation utilities for palette forms. */

/** Validates keyword format and length (2-20 chars, alphanumeric + hyphens). */
export const isValidKeyword = (keyword: string): boolean => {
  if (!keyword || typeof keyword !== "string") return false;

  const trimmed = keyword.trim();
  if (!trimmed) return false;

  // Length validation (2-20 characters)
  if (trimmed.length < 2 || trimmed.length > 20) return false;

  // Character validation (alphanumeric and hyphens only)
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) return false;

  // Cannot start or end with hyphen
  if (trimmed.startsWith("-") || trimmed.endsWith("-")) return false;

  return true;
};

/** Filters array to keep only valid keywords. */
export const filterValidKeywords = (keywords: string[]): string[] => {
  return keywords.filter(isValidKeyword);
};
