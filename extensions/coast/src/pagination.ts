export type PageInput = {
  offset?: number;
  limit?: number;
};

export type Pagination = {
  offset: number;
  limit: number;
  returned_count: number;
  has_more: boolean;
  next_offset?: number;
  total_count: number;
};

export type TextPagination = {
  offset: number;
  limit: number;
  returned_count: number;
  has_more: boolean;
  next_offset?: number;
  total_count: number;
  /** Offsets count Unicode code points, not UTF-16 code units. */
  unit: string;
};

export type PrefixPagination = {
  offset: number;
  limit: number;
  returned_count: number;
  has_more: boolean;
  next_offset?: number;
  total_count?: number;
};

function integer(name: string, value: number, minimum: number): number {
  if (
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    const qualifier = minimum === 0 ? "nonnegative" : "positive";
    throw new Error(`${name} must be a finite ${qualifier} integer.`);
  }
  return value;
}

export function pageItems<T>(
  items: T[],
  input: PageInput,
  defaultLimit = 50,
  maxLimit = 200,
): { items: T[]; pagination: Pagination } {
  const offset = integer("offset", input.offset ?? 0, 0);
  const requestedLimit = integer("limit", input.limit ?? defaultLimit, 1);
  const effectiveLimit = Math.min(
    requestedLimit,
    integer("maxLimit", maxLimit, 1),
  );
  integer("defaultLimit", defaultLimit, 1);
  if (!Number.isSafeInteger(offset + effectiveLimit)) {
    throw new Error("offset plus the effective limit must be a safe integer.");
  }

  const page = items.slice(offset, offset + effectiveLimit);
  const hasMore = offset + page.length < items.length;
  return {
    items: page,
    pagination: {
      offset,
      limit: effectiveLimit,
      returned_count: page.length,
      has_more: hasMore,
      next_offset: hasMore ? offset + page.length : undefined,
      total_count: items.length,
    },
  };
}

export function pageFetchedPrefix<T>(
  prefix: T[],
  input: PageInput,
  defaultLimit = 50,
  maxLimit = 200,
): { items: T[]; pagination: PrefixPagination } {
  const page = pageItems(prefix, input, defaultLimit, maxLimit);
  return {
    items: page.items,
    pagination: {
      ...page.pagination,
      total_count: page.pagination.has_more ? undefined : prefix.length,
    },
  };
}

export function pageText(
  value: string | null | undefined,
  input: { offset?: number; maxCharacters?: number },
  defaultMaxCharacters = 20_000,
  maximumMaxCharacters = 50_000,
): { text: string; pagination: TextPagination } {
  const result = pageItems(
    [...(value || "")],
    { offset: input.offset, limit: input.maxCharacters },
    defaultMaxCharacters,
    maximumMaxCharacters,
  );
  return {
    text: result.items.join(""),
    pagination: { ...result.pagination, unit: "unicode-code-point" },
  };
}
