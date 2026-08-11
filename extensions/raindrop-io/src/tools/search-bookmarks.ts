import { getPreferenceValues } from "@raycast/api";

import { Bookmark, BookmarksResponse, CollectionsResponse } from "../types";

type Input = {
  /**
   * Free-form text to search for.
   */
  query?: string;
  /**
   * Tags to narrow the search.
   */
  tags?: string[];
  /**
   * Raindrop collection id. Defaults to `0` (All bookmarks).
   */
  collectionId?: number;
  /**
   * Maximum number of items to return. Clamped between 1 and 50.
   */
  limit?: number;
  /**
   * Optional sort override.
   */
  sort?: "newest" | "oldest" | "name-asc" | "name-desc" | "relevance";
};

type SearchResult = {
  id: number;
  title: string;
  url: string;
  excerpt: string;
  note: string;
  tags: string[];
  collectionId: number;
  collectionTitle: string;
  created: string;
  lastUpdate: string;
  highlights: { text: string; note: string }[];
};

const SORT_MAP: Record<NonNullable<Input["sort"]>, string> = {
  newest: "-created",
  oldest: "created",
  "name-asc": "title",
  "name-desc": "-title",
  relevance: "score",
};

export default async function searchBookmarks(input: Input = {}) {
  const preferences = getPreferenceValues<Preferences>();
  const collection = input.collectionId ?? 0;
  const perPage = clamp(input.limit ?? 10, 1, 50);
  const url = new URL(`https://api.raindrop.io/rest/v1/raindrops/${collection}`);

  url.searchParams.set("perpage", perPage.toString());
  const sort = input.sort ? SORT_MAP[input.sort] : preferences.sortBy || "-created";
  if (sort) {
    url.searchParams.set("sort", sort);
  }

  const tokens: string[] = [];
  if (input.query) {
    tokens.push(input.query);
  }
  if (input.tags?.length) {
    tokens.push(...input.tags.filter(Boolean).map((tag) => `#"${tag}"`));
  }
  if (tokens.length) {
    url.searchParams.set("search", tokens.join(" ").trim());
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to search bookmarks: ${response.statusText}`);
  }

  const data = (await response.json()) as BookmarksResponse;
  const items = data.items.slice(0, perPage);

  let collectionTitleMap: Record<number, string> | undefined;
  if (items.some((bookmark) => bookmark.collection?.$id && !bookmark.collection?.title)) {
    collectionTitleMap = await fetchCollectionTitleMap(preferences.token);
  }

  return items.map((bookmark) => mapBookmarkToResult(bookmark, collectionTitleMap));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function mapBookmarkToResult(bookmark: Bookmark, collectionTitleMap?: Record<number, string>): SearchResult {
  const collectionId = bookmark.collection?.$id ?? -1;
  const collectionTitle =
    bookmark.collection?.title ?? collectionTitleMap?.[collectionId] ?? (collectionId === -1 ? "Unsorted" : "Unknown");

  return {
    id: bookmark._id,
    title: bookmark.title,
    url: bookmark.link,
    excerpt: bookmark.excerpt ?? "",
    note: bookmark.note ?? "",
    tags: bookmark.tags ?? [],
    collectionId,
    collectionTitle,
    created: bookmark.created,
    lastUpdate: bookmark.lastUpdate,
    highlights: bookmark.highlights?.map((highlight) => ({ text: highlight.text, note: highlight.note })) ?? [],
  };
}

async function fetchCollectionTitleMap(token: string) {
  try {
    const response = await fetch("https://api.raindrop.io/rest/v1/collections/all", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as CollectionsResponse;
    return Object.fromEntries(data.items.map((collection) => [collection._id, collection.title]));
  } catch {
    return {};
  }
}
