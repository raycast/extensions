import { getPreferenceValues } from "@raycast/api";

import { Collection, CollectionsResponse } from "../types";

type Input = {
  /**
   * Optional filter applied to the collection title or path.
   */
  filter?: string;
};

type CollectionSummary = {
  id: number;
  title: string;
  parentId: number | null;
  path: string;
};

export default async function listCollections(input: Input = {}) {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch("https://api.raindrop.io/rest/v1/collections/all", {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load collections: ${response.statusText}`);
  }

  const data = (await response.json()) as CollectionsResponse;
  const flattened = flattenCollections(data.items);
  const filter = input.filter?.trim().toLowerCase();

  if (filter) {
    return flattened.filter(
      (collection) => collection.title.toLowerCase().includes(filter) || collection.path.toLowerCase().includes(filter),
    );
  }

  return flattened;
}

function flattenCollections(collections: Collection[] = [], parentPath?: string): CollectionSummary[] {
  return collections.flatMap((collection) => {
    const path = parentPath ? `${parentPath} / ${collection.title}` : collection.title;
    const current: CollectionSummary = {
      id: collection._id,
      title: collection.title,
      parentId: collection.parent?.$id ?? null,
      path,
    };

    if (!collection.children?.length) {
      return [current];
    }

    return [current, ...flattenCollections(collection.children, path)];
  });
}
