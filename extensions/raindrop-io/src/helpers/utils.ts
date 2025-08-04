import fetch from "node-fetch";
import { CollectionCreationResponse, FormValues } from "../types";

export async function createCollection({
  preferences,
  title,
}: {
  preferences: Preferences;
  title: string;
}): Promise<CollectionCreationResponse> {
  const response = await fetch("https://api.raindrop.io/rest/v1/collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    body: JSON.stringify({ title, parent: { $id: {} } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create collection: ${response.statusText}`);
  }
  return (await response.json()) as CollectionCreationResponse;
}

export async function createBookmark({
  preferences,
  values,
  showCollectionCreation,
}: {
  preferences: Preferences;
  values: FormValues;
  showCollectionCreation: boolean;
}) {
  let collectionId = values.collection;

  if (showCollectionCreation && values.newCollection) {
    collectionId = await createCollection({
      preferences,
      title: values.newCollection,
    }).then((data) => data.item._id.toString());
  }

  return fetch("https://api.raindrop.io/rest/v1/raindrops", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    body: JSON.stringify({
      items: values.link.split(/[ ,;]/).map((link) => ({
        link: link.trim(),
        title: values.title,
        collectionId,
        tags: values.tags,
        pleaseParse: {},
      })),
    }),
  });
}

export async function getLinkTitle(link: string) {
  let url = link.trim();
  if (!url.match(/^https?:\/\//)) {
    url = `https://${url}`;
  }

  return fetch(url)
    .then((response) => response.text())
    .then((html) => {
      const match = html.match(/<title>(.*?)<\/title>/i);
      const title = match ? match[1] : "";
      return title;
    })
    .catch((error) => {
      console.error("Error fetching title:", error);
      return "";
    });
}
