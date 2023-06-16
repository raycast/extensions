import { Cache } from "@raycast/api";
import { useState } from "react";

export interface History {
  date: number;
  prompt: string;
  content: string;
}

const DEFAULT_HISTORY = [{ date: new Date().getTime(), prompt: "", content: "" }];
const CACHE_HISTORY_KEY = "History";
const cache = new Cache();

export function useHistories() {
  const cached = JSON.parse(cache.get(CACHE_HISTORY_KEY) ?? JSON.stringify(DEFAULT_HISTORY));
  const [histories, setHistories] = useState<History[]>(cached);

  const handleSetHistories = (histories: History[]) => {
    setHistories(histories);
    cache.set(CACHE_HISTORY_KEY, JSON.stringify(histories));
  };

  const clearHistories = () => {
    cache.remove(CACHE_HISTORY_KEY);
    setHistories(DEFAULT_HISTORY);
  };

  return { histories, handleSetHistories, clearHistories };
}
