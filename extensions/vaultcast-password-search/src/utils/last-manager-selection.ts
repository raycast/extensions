import { LocalStorage } from "@raycast/api";

const LAST_MANAGER_ID_KEY = "lastManagerId";

export async function loadLastManagerId(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(LAST_MANAGER_ID_KEY);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function saveLastManagerId(managerId: string): Promise<void> {
  await LocalStorage.setItem(LAST_MANAGER_ID_KEY, managerId);
}
