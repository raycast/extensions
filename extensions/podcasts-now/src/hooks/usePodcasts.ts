import { LocalStorage } from "@raycast/api";

import { PODCASTS_FEEDS_KEY } from "../constants";
import { getFeed } from "../feed-parser";
import { useCachedPromise } from "@raycast/utils";

export const usePodcastFeeds = () => {
  return useCachedPromise<() => Promise<string[]>>(async () => {
    const podcastsFeeds = await LocalStorage.getItem(PODCASTS_FEEDS_KEY);

    if (typeof podcastsFeeds !== "string") {
      return;
    }

    return JSON.parse(podcastsFeeds);
  });
};

export const usePodcast = (feed: string) => {
  return useCachedPromise(getFeed, [feed]);
};
