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
 * Pull a trailing release year out of a title query ("Dune 1989", "Dune (1989)").
 * Leaves the original text alone when stripping the year would leave nothing comparable
 * (so "1984" stays a title) or when an explicit `year` argument is already set.
 */
export function resolveLookupQuery(
  query: string | undefined,
  year?: number,
): { text: string | undefined; year: number | undefined } {
  if (!query) return { text: undefined, year };

  const trimmed = query.trim();
  const match = trimmed.match(/^(.*?)(?:\s+|\s*\()\b((?:19|20)\d{2})\s*\)?\s*$/);
  if (!match) return { text: trimmed, year };

  const text = match[1].trim();
  if (!isMatchableTitle(text)) return { text: trimmed, year };

  return { text, year: year ?? Number(match[2]) };
}

export type TitleMatchKind = "exact" | "partial" | "none";

/**
 * Classify a lookup against one or more titles.
 *
 * Accents cannot decide the verdict: comparing raw text makes "Amelie" miss "Amélie"
 * while the caller still claims every entry was searched. Containment is kept so near
 * misses can be surfaced, but only an outright title match (or the requested Trakt ID)
 * counts as presence, otherwise "Dune: Part Two" would answer for "Dune".
 */
export function classifyTitleMatch(
  titles: string | Array<string | undefined>,
  query: string | undefined,
  ids?: { requested?: number; item?: number },
): TitleMatchKind {
  if (ids?.requested !== undefined && ids.item === ids.requested) return "exact";
  if (!query) return "none";

  const normalizedQuery = normalizeTitle(query);
  if (!normalizedQuery) return "none";

  let partial = false;
  for (const title of Array.isArray(titles) ? titles : [titles]) {
    if (!title) continue;
    const normalizedTitle = normalizeTitle(title);
    if (normalizedTitle === normalizedQuery) return "exact";
    if (normalizedTitle.includes(normalizedQuery)) partial = true;
  }

  return partial ? "partial" : "none";
}

/**
 * Split a scanned list the way history splits releases: a year stuffed into the query
 * ("Dune 1989") is a year filter, but a title that already ends with those digits
 * ("Blade Runner 2049", "1984") stays a title.
 */
export function partitionByLookup<T>(
  items: T[],
  titlesOf: (item: T) => string | Array<string | undefined>,
  idOf: (item: T) => number,
  yearOf: (item: T) => number | undefined,
  query: string | undefined,
  traktId?: number,
  year?: number,
): { exact: T[]; related: T[]; yearHeldBy: T[]; yearUnknown: T[] } {
  const lookup = resolveLookupQuery(query, year);
  const classify = (item: T, q: string | undefined) =>
    classifyTitleMatch(titlesOf(item), q, { requested: traktId, item: idOf(item) });

  const rawExact = items.filter((item) => classify(item, query) === "exact");
  const strippedDistinct = Boolean(lookup.text) && normalizeTitle(lookup.text ?? "") !== normalizeTitle(query ?? "");
  const useStripped = rawExact.length === 0 && strippedDistinct;
  const comparable = useStripped ? lookup.text : query;
  const appliedYear = useStripped ? lookup.year : year;

  const titleExact = items.filter((item) => classify(item, comparable) === "exact");
  const related = items.filter((item) => classify(item, comparable) === "partial");

  if (appliedYear === undefined) {
    return { exact: titleExact, related, yearHeldBy: [], yearUnknown: [] };
  }

  return {
    exact: titleExact.filter((item) => yearOf(item) === appliedYear),
    related,
    yearHeldBy: titleExact.filter((item) => {
      const itemYear = yearOf(item);
      return itemYear !== undefined && itemYear !== appliedYear;
    }),
    // A missing year is not the requested year and is not a different year either.
    yearUnknown: titleExact.filter((item) => yearOf(item) === undefined),
  };
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
