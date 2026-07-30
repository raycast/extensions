import { LocalStorage } from "@raycast/api";

const API_TOKEN_STORAGE_KEY = "skills-re-api-token";

export const getApiToken = async () => {
  const token = await LocalStorage.getItem<string>(API_TOKEN_STORAGE_KEY);
  return token?.trim() || undefined;
};

export const setApiToken = async (token: string) => {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error("API token cannot be empty.");
  }
  await LocalStorage.setItem(API_TOKEN_STORAGE_KEY, trimmedToken);
};

export const removeApiToken = async () => {
  await LocalStorage.removeItem(API_TOKEN_STORAGE_KEY);
};
