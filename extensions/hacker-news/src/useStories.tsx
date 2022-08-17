import os from "node:os";
import { useEffect, useState } from "react";
import { Cache, environment } from "@raycast/api";
import Parser from "rss-parser";

const cache = new Cache();
// The HNRSS service caches responses for 5 minutes: https://github.com/hnrss/hnrss/issues/71
const CACHE_DURATION = 300000;
type CacheEntry = { timestamp: number; items: Parser.Item[] };

export enum Topic {
  Active = "active",
  AskHN = "ask",
  Best = "best",
  BestComments = "bestcomments",
  Classic = "classic",
  FrontPage = "frontpage",
  Invited = "invited",
  Jobs = "jobs",
  Launches = "launches",
  NewComments = "newcomments",
  Newest = "newest",
  Polls = "polls",
  Pool = "pool",
  ShowHN = "show",
  WhoIsHiring = "whoishiring",
}

interface State {
  isLoading: boolean;
  items: Parser.Item[];
  error: Error | null;
}

const parser = new Parser({
  headers: {
    "User-Agent": `Hacker News Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
  },
});

export const useStories = (topic: Topic | null): [Parser.Item[], boolean, Error | null] => {
  const [state, setState] = useState<State>({ items: [], isLoading: true, error: null });

  useEffect(() => {
    async function fetchStories() {
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
          // nothing to do
        }
      }

      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const feed = await parser.parseURL(`https://hnrss.org/${topic}?count=30`);
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

    fetchStories();
  }, [topic]);

  return [state.items, state.isLoading, state.error];
};
