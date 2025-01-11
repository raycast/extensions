import { useFetch } from "@raycast/utils";
import Parser from "rss-parser";
import { FeedItem, Language } from "../types";
import { FEEDS } from "../constants/feeds";

const parser = new Parser();

export function useFeedData(feedKey: Language) {
  return useFetch(FEEDS[feedKey].url, {
    parseResponse: async (response) => {
      const text = await response.text();
      const feed = await parser.parseString(text);
      return feed.items.map((item) => ({
        icon: item.enclosure?.url || "icon.png",
        title: item.title || "",
        link: item.link || "",
        pubDate: item.pubDate || "",
        content: item.content || "",
        enclosure: item.enclosure,
      }));
    },
    initialData: [] as FeedItem[],
  });
}
