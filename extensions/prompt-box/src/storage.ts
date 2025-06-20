import { LocalStorage } from "@raycast/api";
import { Prompt } from "./types";

const PROMPTS_CACHE_KEY = "prompts_cache";
const LAST_SYNC_KEY = "last_sync_time";

export async function getCachedPrompts(): Promise<Prompt[]> {
  try {
    const cached = await LocalStorage.getItem<string>(PROMPTS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Prompt[];
    }
    return [];
  } catch (error) {
    console.error("Failed to get cached prompts:", error);
    return [];
  }
}

export async function setCachedPrompts(prompts: Prompt[]): Promise<void> {
  try {
    await LocalStorage.setItem(PROMPTS_CACHE_KEY, JSON.stringify(prompts));
    await LocalStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    console.error("Failed to cache prompts:", error);
    throw error;
  }
}

export async function getLastSyncTime(): Promise<Date | null> {
  try {
    const lastSync = await LocalStorage.getItem<string>(LAST_SYNC_KEY);
    return lastSync ? new Date(lastSync) : null;
  } catch (error) {
    console.error("Failed to get last sync time:", error);
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    await LocalStorage.removeItem(PROMPTS_CACHE_KEY);
    await LocalStorage.removeItem(LAST_SYNC_KEY);
  } catch (error) {
    console.error("Failed to clear cache:", error);
    throw error;
  }
}
