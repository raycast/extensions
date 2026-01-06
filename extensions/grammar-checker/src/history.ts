import { LocalStorage } from "@raycast/api";
import { Issue } from "./api";

export interface HistoryItem {
  id: string;
  date: string;
  original: string;
  corrected: string;
  issues: Issue[];
}

const HISTORY_KEY = "grammar-check-history";
const MAX_HISTORY_ITEMS = 20;

export class HistoryManager {
  static async saveCheck(
    original: string,
    corrected: string,
    issues: Issue[],
  ): Promise<void> {
    const history = await HistoryManager.getHistory();
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      original,
      corrected,
      issues,
    };

    const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  }

  static async getHistory(): Promise<HistoryItem[]> {
    const data = await LocalStorage.getItem<string>(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async clearHistory(): Promise<void> {
    await LocalStorage.removeItem(HISTORY_KEY);
  }
}
