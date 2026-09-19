import type { Cache } from "@raycast/api";
import { createNamespacedCache } from "../utils/extension-cache";

class InputHistoryStore {
  private cache: Cache;
  private key: string;
  private maxHistorySize: number;

  constructor(cache: Cache, key = "inputHistory", maxSize = 50) {
    this.cache = cache;
    this.key = key;
    this.maxHistorySize = maxSize;
  }

  addToHistory(input: string): void {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    let history = this.getHistory();
    history = history.filter((item) => item !== trimmedInput);
    history.unshift(trimmedInput);

    if (history.length > this.maxHistorySize) {
      history = history.slice(0, this.maxHistorySize);
    }

    this.cache.set(this.key, JSON.stringify(history));
  }

  getHistory(): string[] {
    const historyJson = this.cache.get(this.key);
    try {
      const parsed = historyJson ? JSON.parse(historyJson) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse input history:", e);
      return [];
    }
  }

  clearHistory(): void {
    this.cache.remove(this.key);
  }

  removeFromHistory(input: string): void {
    const history = this.getHistory();
    const filteredHistory = history.filter((item) => item !== input);
    this.cache.set(this.key, JSON.stringify(filteredHistory));
  }
}

const cache = createNamespacedCache("input-history-v1", ["inputHistory"]);
const inputHistoryStore = new InputHistoryStore(cache);

export default inputHistoryStore;
