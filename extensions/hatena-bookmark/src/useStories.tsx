import os from "node:os";
import { useEffect, useState } from "react";
import { Cache, environment } from "@raycast/api";
import Parser from "rss-parser";

const cache = new Cache();
const CACHE_DURATION = 300000;
type CacheEntry = { timestamp: number; items: Parser.Item[] };

export enum Topic {
  総合 = "hotentry.rss",
  一般 = "hotentry/general.rss",
  世の中 = "hotentry/social.rss",
  政治と経済 = "hotentry/economics.rss",
  暮らし = "hotentry/life.rss",
  学び = "hotentry/knowledge.rss",
  テクノロジー = "hotentry/it.rss",
  おもしろ = "hotentry/fun.rss",
  エンタメ = "hotentry/entertainment.rss",
  アニメとゲーム = "hotentry/game.rss",
}

interface State {
  isLoading: boolean;
  items: Parser.Item[];
  error: Error | null;
}

type CustomItem = {
  "hatena:bookmarkcount": number;
  "hatena:bookmarkCommentListPageUrl": string;
};

const parser: Parser<CustomItem> = new Parser({
  headers: {
    "User-Agent": `Hatena Bookmark Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
  },
  customFields: {
    item: ["hatena:bookmarkcount", "hatena:bookmarkCommentListPageUrl"],
  },
});

export const useStories = (topic: Topic | null): [Parser.Item[], boolean, Error | null] => {
  const [state, setState] = useState<State>({ items: [], isLoading: true, error: null });

  useEffect(() => {
    async function fetchHotEntries() {
      if (!topic) {
        return;
      }
      const cachedResponse = cache.get(topic);

      if (cachedResponse) {
        try {
          const parsed: CacheEntry = JSON.parse(cachedResponse);
          const elapsed = Date.now() - parsed.timestamp;
          console.log(`${topic} cache age: ${elapsed / 1000} seconds`);
          if (elapsed <= CACHE_DURATION) {
            setState((previous) => ({ ...previous, items: parsed.items, isLoading: false }));
            return;
          }
        } catch (e) {
          //nothin to do
        }
      }

      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const feed = await parser.parseURL(`http://b.hatena.ne.jp/${topic}`);
        setState((previous) => ({ ...previous, items: feed.items, isLoading: false }));
        cache.set(topic, JSON.stringify({ timestamp: Date.now(), items: feed.items }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
          items: [],
        }));
      }
    }

    fetchHotEntries();
  }, [topic]);

  return [state.items, state.isLoading, state.error];
};
