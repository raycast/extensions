import { getPreferenceValues, showToast, Toast, showHUD, open } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  token: string;
}

interface Bookmark {
  id: string;
  link: string;
}

interface Bookmarks {
  items: Bookmark[];
  count: number;
}

const getNumberOfPages = async (token: string) => {
  // initial fetch to get the total count of raindrops and calculate how many pages there are
  const url = "https://api.raindrop.io/rest/v1/raindrops/0";
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    showToast(Toast.Style.Failure, "Failed to fetch your bookmarks", response.statusText);

    return;
  }

  const json: Bookmarks = (await response.json()) as Bookmarks;

  return Math.floor(json?.count / 50);
};

export default async () => {
  const preferences = getPreferenceValues<Preferences>();

  await showHUD("Surfacing random bookmark...");

  const totalPages: number = (await getNumberOfPages(preferences.token)) || 1;
  const randPage: number = Math.floor(Math.random() * (Math.floor(totalPages) + 1));

  const url = `https://api.raindrop.io/rest/v1/raindrops/0?page=${randPage}&perpage=50`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
  });

  if (!response.ok) {
    showToast(Toast.Style.Failure, "Failed to fetch your bookmarks", response.statusText);
    return;
  }

  const json: Bookmarks = (await response.json()) as Bookmarks;
  const randBookmark = Math.floor(Math.random() * (Math.floor(json.items.length) + 1));

  await open(json.items[randBookmark].link);
};
