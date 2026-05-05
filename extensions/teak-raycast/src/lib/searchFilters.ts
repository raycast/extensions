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

export type ParsedSearchFilters = {
  favorited?: boolean;
  hasExplicitFilters: boolean;
  query: string;
  rawQuery: string;
  sort: RaycastSort;
  tag?: string;
  type?: RaycastCardType;
};

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

export const parseSearchFilters = (rawQuery: string): ParsedSearchFilters => {
  const queryTerms: string[] = [];
  const tokens = rawQuery.trim().split(/\s+/).filter(Boolean);

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
    tokens.push(`type:${filters.type}`);
  }

  if (filters.tag) {
    tokens.push(`tag:${filters.tag}`);
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
