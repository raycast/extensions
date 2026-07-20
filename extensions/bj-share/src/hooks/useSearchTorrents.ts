import { useState, useEffect } from "react";
import { LocalStorage, Cache, showToast, Toast } from "@raycast/api";
import Parser from "rss-parser";
import { Feed, TorrentItem } from "../types";
import { CACHE_TTL, STORAGE_KEY_FEEDS } from "../utils/constants";

const cache = new Cache();

export function useSearchTorrents() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [activeFeedUrl, setActiveFeedUrl] = useState<string>("");
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadFeeds() {
      try {
        const storedData = await LocalStorage.getItem<string>(STORAGE_KEY_FEEDS);
        if (storedData) {
          const parsedFeeds: Feed[] = JSON.parse(storedData);
          setFeeds(parsedFeeds);
          if (parsedFeeds.length > 0) setActiveFeedUrl(parsedFeeds[0].url);
        }
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to load feeds" });
      } finally {
        setIsLoading(false);
      }
    }
    loadFeeds();
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!activeFeedUrl) return;

    async function fetchFeed() {
      setIsLoading(true);
      const safeUrlKey = Buffer.from(activeFeedUrl).toString("base64");
      const cachedData = cache.get(`data_${safeUrlKey}`);
      const cachedTime = cache.get(`time_${safeUrlKey}`);
      const now = Date.now();

      if (cachedData && cachedTime && now - parseInt(cachedTime, 10) < CACHE_TTL) {
        try {
          const parsed = JSON.parse(cachedData);
          if (isMounted) {
            setTorrents(parsed);
            setLastFetch(parseInt(cachedTime, 10));
            setIsLoading(false);
          }
          return;
        } catch (error) {
          console.error("Failed to parse cached torrents", error);
          cache.remove(`data_${safeUrlKey}`);
          cache.remove(`time_${safeUrlKey}`);
        }
      }

      try {
        const parser = new Parser({ customFields: { item: ["seeders", "leechers"] } });
        const feed = await parser.parseURL(activeFeedUrl);
        const items = feed.items as TorrentItem[];
        cache.set(`data_${safeUrlKey}`, JSON.stringify(items));
        cache.set(`time_${safeUrlKey}`, now.toString());
        if (isMounted) {
          setTorrents(items);
          setLastFetch(now);
          showToast({ style: Toast.Style.Success, title: "Feed updated successfully!" });
        }
      } catch {
        if (isMounted) {
          showToast({ style: Toast.Style.Failure, title: "Connection Error" });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    fetchFeed();
    return () => {
      isMounted = false;
    };
  }, [activeFeedUrl, refreshTrigger]);

  const forceRefresh = () => {
    const safeUrlKey = Buffer.from(activeFeedUrl).toString("base64");
    cache.remove(`data_${safeUrlKey}`);
    cache.remove(`time_${safeUrlKey}`);
    setRefreshTrigger((prev) => prev + 1);
    showToast({ style: Toast.Style.Animated, title: "Updating feed..." });
  };

  return {
    feeds,
    activeFeedUrl,
    setActiveFeedUrl,
    torrents,
    isLoading,
    lastFetch,
    forceRefresh,
  };
}
