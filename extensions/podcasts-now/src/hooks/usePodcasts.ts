import { useCachedPromise } from "@raycast/utils";
import { reverse } from "lodash";

import { getFeed } from "../feed-parser";
import { getFeeds } from "../utils";

export const usePodcastFeeds = () => {
  return useCachedPromise<() => Promise<string[]>>(async () => {
    const feeds = await getFeeds();

    return reverse(feeds);
  });
};

export const usePodcast = (feed: string) => {
  return useCachedPromise(getFeed, [feed]);
};
