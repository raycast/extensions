// src/utils/preferences.ts
import { LocalStorage } from "@raycast/api";

const API_KEY_STORAGE_KEY = "shodan_api_key";

export const getApiKey = async (): Promise<string> => {
  return (await LocalStorage.getItem(API_KEY_STORAGE_KEY)) || "";
};

export const setApiKey = async (apiKey: string): Promise<void> => {
  await LocalStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
};
