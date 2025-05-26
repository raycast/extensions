import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { ErrorResponse, Items, Library } from "./types";

const baseUrl = "https://web.getmatter.com/api";

async function getQueue(page: number) {
  const url = `${baseUrl}/library_items/queue_feed?page=${page}`;
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
  const url = `${baseUrl}/library_items/favorites_feed?page=${page}`;
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
  const url = `${baseUrl}/library_entries`;
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

async function bookmarkUrl(url: string) {
  const apiUrl = `${baseUrl}/save`;
  const token = getPreferenceValues<Preferences>().matterToken;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  };

  const response = await fetch(apiUrl, options);
  let raw = "";
  try {
    await response.json();
  } catch {
    raw = await response.text();
  }
  return {
    raw,
    status: response.status,
  };
}

export { getQueue, getFavorites, setFavorite, bookmarkUrl };
