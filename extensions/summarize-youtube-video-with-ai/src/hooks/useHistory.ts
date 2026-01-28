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
    const uniqueKey = `${item.id}-${item.aiService}`;
    await LocalStorage.setItem(`${HISTORY_KEYS_PREFIX}${uniqueKey}`, JSON.stringify(item));

    const keys = await getHistoryKeys();
    if (!keys.includes(uniqueKey)) {
      keys.unshift(uniqueKey);
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
