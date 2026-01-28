import { LocalStorage } from "@raycast/api";
import { parseInt, split, truncate, uniq } from "lodash";
import { PODCASTS_FEEDS_KEY } from "./constants";

export const trimTitle = (title?: string) => {
  return truncate(title, { length: 36, separator: " " });
};

export const formatDuration = (duration: string) => {
  const comps = split(duration, ":");
  if (comps.length === 1) {
    try {
      const date = new Date(0);
      date.setSeconds(parseInt(comps[0]));
      return date.toISOString().substring(11, 19);
    } catch (err) {
      return "";
    }
  }
  if (comps.length === 2 || comps.length === 3) {
    return duration;
  }
  return "";
};

export const formatProgress = (cur: number, total: number) => {
  if (!total || !cur) return "";
  return `${Math.round((cur / total) * 100)}%`;
};

const urlValidator = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

export const getFeeds = async () => {
  const feedsValue = await LocalStorage.getItem<string>(PODCASTS_FEEDS_KEY);
  let urls = [];
  if (typeof feedsValue === "string") {
    urls = JSON.parse(feedsValue);
  }
  return urls.filter(urlValidator);
};

export const saveFeeds = async (urls: string[]) => {
  const validUrls = urls.filter(urlValidator);
  await LocalStorage.setItem(PODCASTS_FEEDS_KEY, JSON.stringify(uniq(validUrls)));
};

export const removeFeed = async (feed: string) => {
  const feeds = await getFeeds();

  const newFeeds = feeds.filter((url: string) => url !== feed);
  await saveFeeds(newFeeds);
};
