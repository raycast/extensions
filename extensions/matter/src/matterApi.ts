import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { Items, Preferences } from "./types";

async function getQueue() {
  const url = "https://web.getmatter.com/api/library_items/queue_feed?page=1";
  const token = getPreferenceValues<Preferences>().matterToken;
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const response = await fetch(url, options);
    return (await response.json()) as Items;
  } catch (error) {
    console.error(error);
  }
}

async function getFavorites() {
  const url = "https://web.getmatter.com/api/library_items/favorites_feed?page=1";
  const token = getPreferenceValues<Preferences>().matterToken;
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error(error);
  }
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

  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error(error);
  }
}

export { getQueue, getFavorites, setFavorite };
