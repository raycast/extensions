import { useCachedPromise } from "@raycast/utils";
import Parser from "rss-parser";

import * as timeago from "timeago.js";
import nl from "timeago.js/lib/lang/nl";

const parser = new Parser();
timeago.register("nl_NL", nl);

export type RSSItem = Parser.Item & {
  ago: string;
};

const fetchRSSFeed = async (url: string) => {
  try {
    const feed = await parser.parseURL(url);
    return feed.items;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const useRSSFeeds = (urls: string[], ignoreVideo = false) => {
  return useCachedPromise(
    async (urls: string[], ignore: boolean) => {
      const promises = urls.map((url) => fetchRSSFeed(url));
      const feeds = await Promise.all(promises);
      return feeds
        .flat()
        .filter((item, index, self) => {
          if (ignore && item.categories?.includes("videos")) {
            return false;
          }
          return self.findIndex((t) => t.guid === item.guid) === index;
        })
        .sort((a, b) => {
          if (!a.isoDate || !b.isoDate) {
            return 0;
          }
          return new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime();
        })
        .map((item) => {
          const ago = timeago
            .format(item.pubDate?.toString() ?? "", "nl_NL")
            .replace("geleden", "")
            .trim();
          const rssItem: RSSItem = { ...item, ago };
          return rssItem;
        });
    },
    [urls, ignoreVideo],
  );
};
