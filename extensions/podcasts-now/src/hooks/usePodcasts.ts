import { LocalStorage, Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { forEach } from "lodash";

import { PODCASTS_FEEDS_KEY } from "../constants";
import { getFeed, Podcast } from "../feed-parser";

const cache = new Cache({ namespace: "podcasts" });

export const usePodcasts = () => {
  const [podcastsFeedsUrls, setPodcastsFeedsUrls] = useState<string[]>([]);
  const [data, setData] = useState<Podcast[]>([]);
  const [revalidate, setRevalidate] = useState(Date.now());
  const [error, setError] = useState<Error>();

  useEffect(() => {
    (async () => {
      if (!revalidate) return;

      const podcastsFeeds = await LocalStorage.getItem(PODCASTS_FEEDS_KEY);

      if (typeof podcastsFeeds !== "string") {
        return;
      }

      const urls: string[] = JSON.parse(podcastsFeeds);
      setPodcastsFeedsUrls(urls);
    })();
  }, [revalidate]);

  useEffect(() => {
    (async () => {
      forEach(podcastsFeedsUrls, (url) => {
        const cached = cache.get(url);
        if (cached) {
          setData((prev) => {
            if (prev.find((podcast) => podcast.feedUrl === url)) {
              return prev;
            }
            return [...prev, JSON.parse(cached)];
          });
        } else {
          try {
            getFeed(url).then((podcast) => {
              cache.set(url, JSON.stringify(podcast));
              setData((prev) => [...prev, podcast]);
            });
          } catch (err) {
            setError(err as Error);
          }
        }
      });
    })();
  }, [podcastsFeedsUrls]);

  return {
    isLoading: data.length !== podcastsFeedsUrls.length,
    data,
    revalidate: () => setRevalidate(Date.now()),
    error,
  };
};
