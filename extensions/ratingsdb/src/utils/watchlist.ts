import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Media } from "../types";
import { showFailureToast } from "@raycast/utils";

const WATCHLIST_KEY = "watchlist";

export async function addToWatchlist(media: Media): Promise<void> {
  const watchlist = await readWatchlist();
  const existingIndex = watchlist.findIndex((item) => item.imdbID === media.imdbID);

  if (existingIndex === -1) {
    watchlist.push(media);
    await saveWatchlist(watchlist);
    await showToast({ style: Toast.Style.Success, title: "Added to watchlist" });
  }
}

export async function removeFromWatchlist(imdbID: string): Promise<void> {
  const watchlist = await readWatchlist();
  const updatedList = watchlist.filter((item) => item.imdbID !== imdbID);
  await saveWatchlist(updatedList);
  await showToast({
    style: Toast.Style.Failure,
    title: "Removed from watchlist",
  });
}

export async function readWatchlist(): Promise<Media[]> {
  try {
    const data = await LocalStorage.getItem<string>(WATCHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    showFailureToast(error, { title: "Could not read watchlist" });
    return [];
  }
}

async function saveWatchlist(watchlist: Media[]): Promise<void> {
  try {
    await LocalStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  } catch (error) {
    showFailureToast(error, { title: "Could not save watchlist" });
    throw error;
  }
}

export async function isOnWatchlist(imdbID: string): Promise<boolean> {
  const watchlist = await readWatchlist();
  return watchlist.some((item) => item.imdbID === imdbID);
}
