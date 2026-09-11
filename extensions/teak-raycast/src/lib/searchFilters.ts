export const CARD_TYPES = [
  "text",
  "link",
  "image",
  "video",
  "audio",
  "document",
  "palette",
  "quote",
] as const;

export const SORT_OPTIONS = ["newest", "oldest"] as const;

export type RaycastCardType = (typeof CARD_TYPES)[number];
export type RaycastSort = (typeof SORT_OPTIONS)[number];

export interface ParsedSearchFilters {
  favorited?: boolean;
  hasExplicitFilters: boolean;
  query: string;
  rawQuery: string;
  sort: RaycastSort;
  tag?: string;
  type?: RaycastCardType;
}

const CARD_TYPE_SET = new Set<string>(CARD_TYPES);

const normalizeString = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeType = (value?: string): RaycastCardType | undefined => {
  if (!(value && CARD_TYPE_SET.has(value))) {
    return undefined;
  }

  return value as RaycastCardType;
};

const normalizeSort = (value?: string): RaycastSort => {
  return value === "oldest" ? "oldest" : "newest";
};

const normalizeFavorited = (value?: string): boolean | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (["fav", "favorite", "favorites", "true", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "no"].includes(normalized)) {
    return false;
  }

  return undefined;
};

const WHITESPACE = /\s/;
const NEEDS_QUOTING = /[\s":\\]/;

// Tokenizes the raw search text while keeping double-quoted spans intact so a
// value such as `tag:"design systems"` survives as a single token. Quotes are
// stripped from the emitted token and `\"`/`\\` escapes are unwrapped.
const tokenizeSearchText = (rawQuery: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let hasContent = false;
  let inQuotes = false;

  for (let index = 0; index < rawQuery.length; index += 1) {
    const char = rawQuery[index];

    if (inQuotes) {
      if (char === "\\" && index + 1 < rawQuery.length) {
        const next = rawQuery[index + 1];
        if (next === '"' || next === "\\") {
          current += next;
          index += 1;
          continue;
        }
      }

      if (char === '"') {
        inQuotes = false;
        continue;
      }

      current += char;
      hasContent = true;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      hasContent = true;
      continue;
    }

    if (WHITESPACE.test(char)) {
      if (hasContent) {
        tokens.push(current);
        current = "";
        hasContent = false;
      }
      continue;
    }

    current += char;
    hasContent = true;
  }

  if (hasContent) {
    tokens.push(current);
  }

  return tokens;
};

const formatFilterValue = (value: string): string => {
  if (!NEEDS_QUOTING.test(value)) {
    return value;
  }

  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
};

export const parseSearchFilters = (rawQuery: string): ParsedSearchFilters => {
  const queryTerms: string[] = [];
  const tokens = tokenizeSearchText(rawQuery);

  let favorited: boolean | undefined;
  let sort: RaycastSort = "newest";
  let tag: string | undefined;
  let type: RaycastCardType | undefined;

  for (const token of tokens) {
    const normalized = token.toLowerCase();

    if (["fav", "favorite", "favorites"].includes(normalized)) {
      favorited = true;
      continue;
    }

    const [rawKey, ...rawValueParts] = token.split(":");
    if (!(rawKey && rawValueParts.length > 0)) {
      queryTerms.push(token);
      continue;
    }

    const key = rawKey.toLowerCase();
    const value = rawValueParts.join(":");

    if (key === "type") {
      const nextType = normalizeType(value.toLowerCase());
      if (nextType) {
        type = nextType;
        continue;
      }
    }

    if (key === "tag") {
      const nextTag = normalizeString(value);
      if (nextTag) {
        tag = nextTag;
        continue;
      }
    }

    if (key === "sort") {
      sort = normalizeSort(value.toLowerCase());
      continue;
    }

    if (key === "fav" || key === "favorite" || key === "favorited") {
      const nextFavorited = normalizeFavorited(value);
      if (nextFavorited !== undefined) {
        favorited = nextFavorited;
        continue;
      }
    }

    queryTerms.push(token);
  }

  return {
    favorited,
    hasExplicitFilters: Boolean(
      favorited !== undefined || sort !== "newest" || tag || type,
    ),
    query: queryTerms.join(" ").trim(),
    rawQuery,
    sort,
    tag,
    type,
  };
};

export const buildSearchText = (filters: {
  favorited?: boolean;
  query?: string;
  sort?: RaycastSort;
  tag?: string;
  type?: RaycastCardType;
}): string => {
  const tokens: string[] = [];

  const query = normalizeString(filters.query);
  if (query) {
    tokens.push(query);
  }

  if (filters.type) {
    tokens.push(`type:${formatFilterValue(filters.type)}`);
  }

  if (filters.tag) {
    tokens.push(`tag:${formatFilterValue(filters.tag)}`);
  }

  if (filters.favorited) {
    tokens.push("fav");
  }

  if (normalizeSort(filters.sort) === "oldest") {
    tokens.push("sort:oldest");
  }

  return tokens.join(" ").trim();
};

export const applyTagFilter = (rawQuery: string, tag: string): string => {
  const parsed = parseSearchFilters(rawQuery);
  return buildSearchText({
    ...parsed,
    tag,
  });
};

export const applyTypeFilter = (
  rawQuery: string,
  type?: RaycastCardType,
): string => {
  const parsed = parseSearchFilters(rawQuery);
  return buildSearchText({
    ...parsed,
    type,
  });
};

export const applySortFilter = (
  rawQuery: string,
  sort: RaycastSort,
): string => {
  const parsed = parseSearchFilters(rawQuery);
  return buildSearchText({
    ...parsed,
    sort,
  });
};

export const applyFavoritedFilter = (
  rawQuery: string,
  favorited?: boolean,
): string => {
  const parsed = parseSearchFilters(rawQuery);
  return buildSearchText({
    ...parsed,
    favorited,
  });
};

export const clearSearchFilters = (rawQuery: string): string => {
  const parsed = parseSearchFilters(rawQuery);
  return buildSearchText({
    query: parsed.query,
  });
};
