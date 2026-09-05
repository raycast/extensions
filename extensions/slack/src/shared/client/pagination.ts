export type CursorPage<T> = {
  items: T[];
  nextCursor?: string;
};

type CollectPaginatedResultsOptions<T, Result> = {
  loadPage: (cursor?: string) => Promise<CursorPage<T>>;
  transform: (item: T) => Result | undefined;
  matches: (item: Result) => boolean;
  maxResults: number;
  scanAllPages: boolean;
  signal?: AbortSignal;
  stopAfterPage?: (pageResults: Result[]) => boolean;
  stopAfterMatchingPage?: boolean;
};

/**
 * Scans a cursor-paginated collection while retaining only compact, matching results.
 * Raw API objects are released after each page instead of accumulating for the full scan.
 */
export async function collectPaginatedResults<T, Result>({
  loadPage,
  transform,
  matches,
  maxResults,
  scanAllPages,
  signal,
  stopAfterPage,
  stopAfterMatchingPage = false,
}: CollectPaginatedResultsOptions<T, Result>): Promise<Result[]> {
  const results: Result[] = [];
  let cursor: string | undefined;

  do {
    signal?.throwIfAborted();
    const page = await loadPage(cursor);
    signal?.throwIfAborted();
    const resultCountBeforePage = results.length;
    const pageResults: Result[] = [];

    for (const item of page.items) {
      const result = transform(item);
      if (result && matches(result)) {
        results.push(result);
        pageResults.push(result);
      }

      if (results.length >= maxResults) {
        return results;
      }
    }

    cursor = page.nextCursor || undefined;
    if (stopAfterPage?.(pageResults)) {
      return results;
    }
    if (stopAfterMatchingPage && results.length > resultCountBeforePage) {
      return results;
    }
  } while (cursor && scanAllPages);

  return results;
}

export function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

export function matchesAllWords(values: Array<string | undefined>, query: string): boolean {
  const words = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const searchableText = foldForSearch(values.filter(Boolean).join(" "));
  return words.every((word) => searchableText.includes(word));
}

export function matchesVisibleName(value: string, query: string): boolean {
  const foldedValue = foldForSearch(value).trim();
  const foldedQuery = foldForSearch(query).trim();
  if (!foldedQuery) return true;

  return (
    foldedValue === foldedQuery ||
    foldedValue.startsWith(`${foldedQuery} `) ||
    foldedValue.split(/\s+/).includes(foldedQuery)
  );
}
