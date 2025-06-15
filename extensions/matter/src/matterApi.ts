import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { ErrorResponse, Items, Library } from "./types";

async function getQueue(page: number) {
  const url = `https://web.getmatter.com/api/library_items/queue_feed?page=${page}`;
  const token = getPreferenceValues<Preferences>().matterToken;
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await fetch(url, options);
  return (await response.json()) as Items | ErrorResponse;
}

async function getFavorites(page: number) {
  const url = `https://web.getmatter.com/api/library_items/favorites_feed?page=${page}`;
  const token = getPreferenceValues<Preferences>().matterToken;
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await fetch(url, options);
  return (await response.json()) as Items | ErrorResponse;
}

async function setFavorite(contentId: string, isFavorited: boolean) {
  const url = "https://web.getmatter.com/api/library_entries";
  const token = getPreferenceValues<Preferences>().matterToken;

  const data = {
    content_id: contentId,
    is_favorited: isFavorited,
  };

  const options = {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  };

  const response = await fetch(url, options);
  return (await response.json()) as Library | ErrorResponse;
}

export { getQueue, getFavorites, setFavorite };
