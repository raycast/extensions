import { CARD_SORTS, type CardSort, type CardType, isCardType } from "teak-sdk";
import { parseCardReference } from "./cardReference";

export type RaycastSort = Exclude<CardSort, "relevance">;
/** The API's sorts but best match, which needs a ranked search to mean anything. */
export const SORT_OPTIONS = CARD_SORTS.filter(
  (sort): sort is RaycastSort => sort !== "relevance",
);

export const HUE_OPTIONS = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "cyan",
  "blue",
  "purple",
  "pink",
  "brown",
  "neutral",
] as const;
export const STYLE_OPTIONS = [
  "abstract",
  "cinematic",
  "dark",
  "illustrative",
  "minimal",
  "monochrome",
  "moody",
  "pastel",
  "photographic",
  "retro",
  "surreal",
  "vintage",
  "vibrant",
  "typographic",
  "3d",
  "flat",
  "geometric",
  "hand-drawn",
  "futuristic",
] as const;

export type RaycastCardType = CardType;

export interface ParsedSearchFilters {
  archived?: boolean;
  createdAfter?: number;
  createdBefore?: number;
  done?: boolean;
  favorited?: boolean;
  folder?: string;
  hasExplicitFilters: boolean;
  hex: string[];
  hue: string[];
  like?: string;
  mood?: string;
  ocrText: string[];
  price: string[];
  query: string;
  rawQuery: string;
  sort?: RaycastSort;
  style: string[];
  tag?: string;
  todo?: boolean;
  trashed?: boolean;
  type?: RaycastCardType;
}

type SearchTextFilters = Partial<
  Omit<ParsedSearchFilters, "hasExplicitFilters" | "rawQuery">
>;

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const DATE_VALUE = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/;

export const parseDateFilter = (value: string): number | undefined => {
  const match = DATE_VALUE.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) - 1 : 0;
  const day = match[3] ? Number(match[3]) : 1;
  const date = new Date(year, month, day);
  // JavaScript rolls 2026-02-31 over to March, and month 00 back a year.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date.getTime();
};

const formatDateFilter = (timestamp: number): string => {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const normalizeString = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeType = (value?: string): RaycastCardType | undefined =>
  value && isCardType(value) ? value : undefined;

const normalizeSort = (value?: string): RaycastSort | undefined =>
  (SORT_OPTIONS as readonly string[]).includes(value ?? "")
    ? (value as RaycastSort)
    : undefined;

const IS_VALUES: Record<string, "archived" | "done" | "fav" | "todo"> = {
  archive: "archived",
  archived: "archived",
  done: "done",
  fav: "fav",
  favorite: "fav",
  favorites: "fav",
  "to-do": "todo",
  todo: "todo",
};

const PRICE_BOUND = /^(<=|>=|<|>|=)(\d{1,12}(?:\.\d{1,6})?)$/;

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

interface SearchToken {
  phrase: boolean;
  text: string;
}

const tokenizeSearchText = (rawQuery: string): SearchToken[] => {
  const tokens: SearchToken[] = [];
  let current = "";
  let hasContent = false;
  let inQuotes = false;
  let phrase = false;

  const push = () => {
    tokens.push({ phrase, text: current });
    current = "";
    hasContent = false;
    phrase = false;
  };

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
      phrase = !hasContent;
      inQuotes = true;
      hasContent = true;
      continue;
    }

    if (WHITESPACE.test(char)) {
      if (hasContent) {
        push();
      }
      continue;
    }

    phrase = false;
    current += char;
    hasContent = true;
  }

  if (hasContent) {
    push();
  }

  return tokens;
};

const quotePhrase = (value: string): string =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const formatFilterValue = (value: string): string => {
  if (!NEEDS_QUOTING.test(value)) {
    return value;
  }

  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
};

export const searchQualifier = (key: string, value: string): string =>
  `${key}:${formatFilterValue(value)}`;

export const parseSearchFilters = (rawQuery: string): ParsedSearchFilters => {
  const queryTerms: string[] = [];
  const tokens = tokenizeSearchText(rawQuery);

  let archived: boolean | undefined;
  let done: boolean | undefined;
  let favorited: boolean | undefined;
  let folder: string | undefined;
  let like: string | undefined;
  let mood: string | undefined;
  let sort: RaycastSort | undefined;
  let tag: string | undefined;
  let todo: boolean | undefined;
  let trashed: boolean | undefined;
  let type: RaycastCardType | undefined;
  let createdAfter: number | undefined;
  let createdBefore: number | undefined;
  const hue: string[] = [];
  const style: string[] = [];
  const hex: string[] = [];
  const ocrText: string[] = [];
  const price: string[] = [];

  for (const { phrase, text: token } of tokens) {
    if (phrase) {
      if (token.trim()) {
        queryTerms.push(quotePhrase(token));
      }
      continue;
    }
    const normalized = token.toLowerCase();

    if (["fav", "favorite", "favorites"].includes(normalized)) {
      favorited = true;
      continue;
    }

    if (["trash", "trashed", "deleted"].includes(normalized)) {
      trashed = true;
      continue;
    }

    if (HEX_COLOR.test(token)) {
      hex.push(normalized);
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

    if (
      key === "hue" &&
      (HUE_OPTIONS as readonly string[]).includes(value.toLowerCase())
    ) {
      hue.push(value.toLowerCase());
      continue;
    }

    if (
      key === "style" &&
      (STYLE_OPTIONS as readonly string[]).includes(value.toLowerCase())
    ) {
      style.push(value.toLowerCase());
      continue;
    }

    if (key === "after" || key === "before") {
      const timestamp = parseDateFilter(value);
      if (timestamp !== undefined) {
        if (key === "after") {
          createdAfter = timestamp;
        } else {
          createdBefore = timestamp;
        }
        continue;
      }
    }

    if (key === "in" && value.toLowerCase() === "trash") {
      trashed = true;
      continue;
    }

    if (key === "fav" || key === "favorite" || key === "favorited") {
      const nextFavorited = normalizeFavorited(value);
      if (nextFavorited !== undefined) {
        favorited = nextFavorited;
        continue;
      }
    }

    if (key === "is") {
      const flag = IS_VALUES[value.toLowerCase()];
      if (flag) {
        archived = flag === "archived" ? true : archived;
        done = flag === "done" ? true : done;
        favorited = flag === "fav" ? true : favorited;
        todo = flag === "todo" ? true : todo;
        continue;
      }
    }

    if (key === "like") {
      const cardId = parseCardReference(value);
      if (cardId) {
        like = cardId;
        continue;
      }
    }

    if (key === "mood" || key === "text" || key === "folder") {
      const nextValue = normalizeString(value);
      if (nextValue) {
        if (key === "mood") {
          mood = nextValue;
        } else if (key === "folder") {
          folder = nextValue;
        } else {
          ocrText.push(nextValue);
        }
        continue;
      }
    }

    if (key === "price") {
      const match = PRICE_BOUND.exec(value.trim());
      if (match) {
        price.push(`${match[1]}${Number(match[2])}`);
        continue;
      }
    }

    queryTerms.push(token);
  }

  return {
    archived,
    createdAfter,
    createdBefore,
    done,
    favorited,
    folder,
    hasExplicitFilters: Boolean(
      archived ||
      done ||
      favorited !== undefined ||
      folder ||
      like ||
      mood ||
      (sort && sort !== "newest") ||
      tag ||
      todo ||
      type ||
      trashed ||
      hue.length ||
      style.length ||
      hex.length ||
      ocrText.length ||
      price.length ||
      createdAfter !== undefined ||
      createdBefore !== undefined,
    ),
    hex,
    hue,
    like,
    mood,
    ocrText,
    price,
    query: queryTerms.join(" ").trim(),
    rawQuery,
    sort,
    style,
    tag,
    todo,
    trashed,
    type,
  };
};

const similarityTokens = (filters: SearchTextFilters): string[] => {
  const tokens: string[] = [];
  if (filters.like) {
    tokens.push(`like:${formatFilterValue(filters.like)}`);
  }
  if (filters.mood) {
    tokens.push(`mood:${formatFilterValue(filters.mood)}`);
  }
  for (const value of filters.ocrText ?? []) {
    tokens.push(`text:${formatFilterValue(value)}`);
  }
  for (const value of filters.price ?? []) {
    tokens.push(`price:${value}`);
  }
  if (filters.folder) {
    tokens.push(`folder:${formatFilterValue(filters.folder)}`);
  }
  return tokens;
};

export const buildSearchText = (filters: SearchTextFilters): string => {
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

  if (filters.archived) {
    tokens.push("is:archived");
  }

  if (filters.done) {
    tokens.push("is:done");
  }

  if (filters.todo) {
    tokens.push("is:todo");
  }

  if (filters.trashed) {
    tokens.push("trash");
  }

  tokens.push(...similarityTokens(filters));

  for (const value of filters.hue ?? []) {
    tokens.push(`hue:${value}`);
  }

  for (const value of filters.style ?? []) {
    tokens.push(`style:${value}`);
  }

  tokens.push(...(filters.hex ?? []));

  if (filters.createdAfter !== undefined) {
    tokens.push(`after:${formatDateFilter(filters.createdAfter)}`);
  }

  if (filters.createdBefore !== undefined) {
    tokens.push(`before:${formatDateFilter(filters.createdBefore)}`);
  }

  if (filters.sort) {
    tokens.push(`sort:${filters.sort}`);
  }

  return tokens.join(" ").trim();
};

export const toApiQuery = (filters: ParsedSearchFilters): string =>
  [
    filters.query,
    ...(filters.done ? ["is:done"] : []),
    ...(filters.todo ? ["is:todo"] : []),
    ...similarityTokens(filters),
  ]
    .filter(Boolean)
    .join(" ");

export const toSmartFolderQuery = (
  filters: ParsedSearchFilters,
): string | null => {
  if (
    filters.trashed ||
    filters.hue.length ||
    filters.style.length ||
    filters.hex.length ||
    filters.createdAfter !== undefined ||
    filters.createdBefore !== undefined
  ) {
    return null;
  }
  const query = [
    ...(filters.type ? [`type:${filters.type}`] : []),
    ...(filters.tag ? [`tag:${formatFilterValue(filters.tag)}`] : []),
    ...(filters.favorited ? ["is:fav"] : []),
    ...(filters.archived ? ["is:archived"] : []),
    ...(filters.done ? ["is:done"] : []),
    ...(filters.todo ? ["is:todo"] : []),
    ...similarityTokens(filters),
    filters.query,
  ]
    .filter(Boolean)
    .join(" ");
  return query || null;
};

export const applyTrashedFilter = (
  rawQuery: string,
  trashed?: boolean,
): string => {
  const parsed = parseSearchFilters(rawQuery);
  return buildSearchText({
    ...parsed,
    archived: trashed ? undefined : parsed.archived,
    trashed,
  });
};

export const applyHueFilter = (rawQuery: string, hue?: string): string => {
  const parsed = parseSearchFilters(rawQuery);
  return buildSearchText({ ...parsed, hue: hue ? [hue] : [] });
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

export const applyArchivedFilter = (
  rawQuery: string,
  archived?: boolean,
): string => {
  const parsed = parseSearchFilters(rawQuery);
  return buildSearchText({
    ...parsed,
    archived,
    trashed: archived ? undefined : parsed.trashed,
  });
};

export const applyDoneFilter = (
  rawQuery: string,
  state?: "done" | "todo",
): string => {
  const parsed = parseSearchFilters(rawQuery);
  return buildSearchText({
    ...parsed,
    done: state === "done",
    todo: state === "todo",
  });
};

export const applySortFilter = (
  rawQuery: string,
  sort: RaycastSort,
  options: { keepNewest?: boolean } = {},
): string => {
  const parsed = parseSearchFilters(rawQuery);
  const newestIsDefault = !(options.keepNewest || parsed.like);
  return buildSearchText({
    ...parsed,
    sort: sort === "newest" && newestIsDefault ? undefined : sort,
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
