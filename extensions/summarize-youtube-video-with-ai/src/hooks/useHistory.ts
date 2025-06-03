import { LocalStorage } from "@raycast/api";
import type { Question } from "./useQuestions";

export type HistoryItem = {
  aiService: string;
  createdAt: Date;
  id: string;
  questions: Question[];
  summary: string;
  title: string;
  videoUrl: string;
};

const HISTORY_KEYS_PREFIX = "youtube-summary-";
const HISTORY_KEYS_LIST_KEY = "youtube-summary-keys";

export const useHistory = () => {
  const addToHistory = async (item: HistoryItem) => {
    // Store the item with its video ID as key
    await LocalStorage.setItem(`${HISTORY_KEYS_PREFIX}${item.id}`, JSON.stringify(item));

    // Update the list of keys
    const keys = await getHistoryKeys();
    if (!keys.includes(item.id)) {
      keys.unshift(item.id); // Add new ID to the beginning
      await LocalStorage.setItem(HISTORY_KEYS_LIST_KEY, JSON.stringify(keys));
    }
  };



  const getHistory = async (): Promise<HistoryItem[]> => {
    const keys = await getHistoryKeys();
    const items = await Promise.all(
      keys.map(async (key) => {
        const itemString = await LocalStorage.getItem<string>(`${HISTORY_KEYS_PREFIX}${key}`);
        if (!itemString) return null;
        const item = JSON.parse(itemString);
        // Convert createdAt string back to Date
        item.createdAt = new Date(item.createdAt);
        return item;
      }),
    );
    return items.filter((item): item is HistoryItem => item !== null);
  };

  const getHistoryKeys = async (): Promise<string[]> => {
    const keysString = await LocalStorage.getItem<string>(HISTORY_KEYS_LIST_KEY);
    return keysString ? JSON.parse(keysString) : [];
  };

  return {
    addToHistory,
    getHistory,
  };
};
