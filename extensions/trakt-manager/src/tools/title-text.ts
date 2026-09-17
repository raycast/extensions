export function normalizeTitle(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      // Only Combining Diacritical Marks (Latin / Greek / Cyrillic accents).
      // Stripping every `\p{M}` would drop Devanagari matras and other vowel signs,
      // so distinct titles would compare equal.
      .replace(/[\u0300-\u036f]+/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
  );
}

/** False when the string has no letters or digits left — it cannot decide a title match. */
export function isMatchableTitle(value: string): boolean {
  return normalizeTitle(value).length > 0;
}

/**
 * Explain an empty year-filtered search.
 *
 * "This title has no release that year" and "that release is out of Trakt's reach" look
 * identical once the filter has run, yet only the first is a fact. Saying which one applies
 * keeps the caller from reporting a reachable release as non-existent.
 */
export function describeYearFilter(
  title: string,
  year: number | undefined,
  kept: number,
  total: number,
  truncated: boolean,
): string | undefined {
  if (year === undefined || kept > 0) return undefined;

  if (truncated) {
    return (
      `No ${year} release of "${title}" came back, but Trakt returned as many releases for that title as it ` +
      `can list, so others stay out of reach and this is NOT proof that none exists. Ask the user which ` +
      `release they mean, or search without a year, instead of reporting the year as unknown.`
    );
  }

  return total > 0 ? `"${title}" exists on Trakt, but has no ${year} release.` : undefined;
}
