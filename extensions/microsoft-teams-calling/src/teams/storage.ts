import { LocalStorage } from "@raycast/api";

const TOKEN_KEY = "apiToken";

export async function getToken(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(TOKEN_KEY);
}

export async function setToken(token: string) {
  await LocalStorage.setItem(TOKEN_KEY, token);
}
