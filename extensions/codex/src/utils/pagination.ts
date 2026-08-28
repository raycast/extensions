type PaginatedEntryOptions<T> = {
  requestPage: (cursor: string | null) => Promise<unknown>;
  isEntry: (value: unknown) => value is T;
  description: string;
  maxPages?: number;
  shouldStop?: (entries: readonly T[]) => boolean;
};

export async function collectPaginatedEntries<T>({
  requestPage,
  isEntry,
  description,
  maxPages = Number.POSITIVE_INFINITY,
  shouldStop,
}: PaginatedEntryOptions<T>): Promise<T[]> {
  if (maxPages < 1) {
    throw new Error("maxPages must be at least 1");
  }

  const entries: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  let pageCount = 0;

  do {
    const response = await requestPage(cursor);
    if (
      !isRecord(response) ||
      !Array.isArray(response.data) ||
      !response.data.every(isEntry) ||
      !(response.nextCursor === null || typeof response.nextCursor === "string")
    ) {
      throw new Error(`Received an invalid ${description} response`);
    }

    entries.push(...response.data);
    pageCount += 1;

    cursor = response.nextCursor;
    if (cursor && seenCursors.has(cursor)) {
      throw new Error(`Received a repeated cursor from ${description}`);
    }
    if (cursor) {
      seenCursors.add(cursor);
    }
  } while (cursor && pageCount < maxPages && !(shouldStop?.(entries) ?? false));

  return entries;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
