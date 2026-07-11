import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { useState, useEffect } from "react";

const VISITED_URLS_KEY = "visited_urls_1";

const loadVisitedUrls = async () => {
  const item = await getLocalStorageItem(VISITED_URLS_KEY);
  try {
    if (typeof item === "string") {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        return parsed as string[];
      }
    }
  } catch (e) {
    console.error("failed to parse visitedUrls", e);
  }
  return [];
};

const saveVisitedUrls = async (visitedUrls: string[]) => {
  await setLocalStorageItem(VISITED_URLS_KEY, JSON.stringify(visitedUrls));
};

export const useVisitedUrls = (): [string[], (url: string) => void] => {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    loadVisitedUrls().then(setUrls);
  }, []);
  const add = (url: string) => {
    const nextUrls = [url, ...urls.filter((item) => item !== url)].slice(0, 20);
    setUrls(nextUrls);
    saveVisitedUrls(nextUrls);
  };
  return [urls, add];
};
