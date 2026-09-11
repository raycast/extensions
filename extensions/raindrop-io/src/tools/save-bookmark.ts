import { getPreferenceValues, Tool } from "@raycast/api";

import { CreateBookmarksResponse } from "../types";

type Input = {
  /**
   * The URL to save.
   */
  url: string;
  /**
   * Optional title override. Defaults to the URL.
   */
  title?: string;
  /**
   * Optional note that will be stored alongside the bookmark.
   */
  note?: string;
  /**
   * Raindrop collection id (string). Defaults to Unsorted (-1).
   */
  collectionId?: string;
  /**
   * Tags to assign to the bookmark.
   */
  tags?: string[];
};

type SaveBookmarkResult = {
  id: number | undefined;
  title: string;
  url: string;
  collectionId: number;
  tags: string[];
};

export default async function saveBookmark(input: Input): Promise<SaveBookmarkResult> {
  if (!input.url?.trim()) {
    throw new Error("A URL is required to save a bookmark.");
  }

  const preferences = getPreferenceValues<Preferences>();
  const collectionId = parseCollectionId(input.collectionId);

  const response = await fetch("https://api.raindrop.io/rest/v1/raindrops", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    body: JSON.stringify({
      items: [
        {
          link: input.url.trim(),
          title: input.title?.trim(),
          note: input.note?.trim(),
          collectionId,
          tags: input.tags?.filter(Boolean) ?? [],
          pleaseParse: {},
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save bookmark: ${response.statusText}`);
  }

  const data = (await response.json()) as CreateBookmarksResponse;
  const created = data.items?.[0];

  return {
    id: created?._id,
    title: created?.title ?? input.title ?? input.url,
    url: created?.link ?? input.url,
    collectionId: created?.collection?.$id ?? collectionId,
    tags: created?.tags ?? input.tags ?? [],
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const info = [{ name: "URL", value: input.url }];

  if (input.title) {
    info.push({ name: "Title", value: input.title });
  }

  if (input.collectionId !== undefined) {
    info.push({ name: "Collection", value: String(input.collectionId) });
  }

  if (input.tags?.length) {
    info.push({ name: "Tags", value: input.tags.join(", ") });
  }

  if (input.note) {
    info.push({ name: "Note", value: input.note });
  }

  return { info };
};

function parseCollectionId(value?: string) {
  if (!value) {
    return -1;
  }

  const numeric = Number.parseInt(value, 10);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  return -1;
}
