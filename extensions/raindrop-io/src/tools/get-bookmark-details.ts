import { getPreferenceValues } from "@raycast/api";

import { BookmarkDetailResponse, CollectionResponse } from "../types";

type Input = {
  /**
   * The bookmark id returned by the search-bookmarks tool or Raindrop UI.
   */
  bookmarkId: string;
};

export default async function getBookmarkDetails(input: Input) {
  if (!input.bookmarkId?.trim()) {
    throw new Error("bookmarkId is required");
  }

  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`https://api.raindrop.io/rest/v1/raindrop/${input.bookmarkId}`, {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load bookmark: ${response.statusText}`);
  }

  const data = (await response.json()) as BookmarkDetailResponse;
  const bookmark = data.item;
  const collectionId = bookmark.collection?.$id ?? -1;
  const collectionTitle =
    bookmark.collection?.title ??
    (collectionId === -1 ? "Unsorted" : await fetchCollectionTitle(collectionId, preferences.token)) ??
    "Unknown";

  return {
    id: bookmark._id,
    title: bookmark.title,
    url: bookmark.link,
    note: bookmark.note ?? "",
    excerpt: bookmark.excerpt ?? "",
    html: bookmark.html ?? "",
    tags: bookmark.tags ?? [],
    collectionId,
    collectionTitle,
    highlights: bookmark.highlights?.map((highlight) => ({ text: highlight.text, note: highlight.note })) ?? [],
    created: bookmark.created,
    lastUpdate: bookmark.lastUpdate,
  };
}

async function fetchCollectionTitle(collectionId: number, token: string) {
  if (collectionId < 0) {
    return undefined;
  }

  try {
    const response = await fetch(`https://api.raindrop.io/rest/v1/collection/${collectionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as CollectionResponse;
    return data.item?.title;
  } catch {
    return undefined;
  }
}
