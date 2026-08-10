import { getPreferenceValues } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { existsSync } from "fs";
import { cpus } from "os";
import { useMemo, useState, useCallback } from "react";
import { Tweet } from "../types";
import { sanitizeString, safeParseTweet } from "../utils/sanitize";

const defaultBirdPath = cpus()[0].model.includes("Apple") ? "/opt/homebrew/bin/bird" : "/usr/local/bin/bird";

const BATCH_SIZE = 20;
const MAX_COUNT = 500;

export function getBirdPath(): string {
  const prefs = getPreferenceValues<{ birdPath?: string }>();
  return prefs.birdPath || defaultBirdPath;
}

export function isBirdInstalled(): boolean {
  return existsSync(getBirdPath());
}

export function useBirdCommand(command: "bookmarks" | "likes") {
  const birdBin = getBirdPath();
  const installed = isBirdInstalled();
  const [count, setCount] = useState(BATCH_SIZE);

  const { isLoading, data, error, revalidate } = useExec(birdBin, [command, "--json", "-n", String(count)], {
    keepPreviousData: true,
    execute: installed,
  });

  const tweets = useMemo<Tweet[]>(() => {
    if (!data) return [];
    try {
      const sanitized = sanitizeString(data);
      const parsed = JSON.parse(sanitized) as Tweet[];
      return parsed.map((tweet) => safeParseTweet(tweet)).filter((tweet): tweet is Tweet => tweet !== null);
    } catch {
      return [];
    }
  }, [data]);

  const loadMore = useCallback(() => {
    if (count < MAX_COUNT) {
      setCount((prev) => Math.min(prev + BATCH_SIZE, MAX_COUNT));
    }
  }, [count]);

  const canLoadMore = count < MAX_COUNT && tweets.length >= count;

  return {
    isLoading,
    data: tweets,
    error,
    revalidate,
    loadMore,
    canLoadMore,
    currentCount: count,
    maxCount: MAX_COUNT,
  };
}
