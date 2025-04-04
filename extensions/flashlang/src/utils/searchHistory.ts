import { LocalStorage } from "@raycast/api";

const HISTORY_KEY = "translation-history";

export interface TranslationHistory {
  [key: string]: string;
}

export async function removeFromSearchHistory(vocabulary: string): Promise<void> {
  try {
    const existingHistory = await LocalStorage.getItem(HISTORY_KEY);
    if (!existingHistory) return;

    const history: TranslationHistory = JSON.parse(existingHistory as string);
    delete history[vocabulary];

    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to remove from search history:", error);
  }
}

export async function getSearchHistory(): Promise<TranslationHistory> {
  try {
    const existingHistory = await LocalStorage.getItem(HISTORY_KEY);
    return existingHistory ? JSON.parse(existingHistory as string) : {};
  } catch (error) {
    console.error("Failed to get search history:", error);
    return {};
  }
}

export async function upsertSearchHistory(vocabulary: string, translation: string): Promise<void> {
  try {
    const existingHistory = await LocalStorage.getItem(HISTORY_KEY);
    const history: TranslationHistory = existingHistory ? JSON.parse(existingHistory as string) : {};

    history[vocabulary] = translation;
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to update search history:", error);
  }
}
