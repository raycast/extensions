import { LocalStorage } from "@raycast/api";

export const STORAGE_KEY_CLIENT_ID = "clientId";

export async function loadClientId(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY_CLIENT_ID);
  return stored?.trim() ?? "";
}

export async function saveClientId(clientId: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
}
