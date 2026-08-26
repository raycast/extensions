import { LocalStorage } from "@raycast/api";
import { HistoryKeyValueStore } from "../history/history";

const DESTINATION_ROOT_KEY = "benchmark-destination-root-v1";

export class RaycastHistoryStore implements HistoryKeyValueStore {
  async get(key: string): Promise<string | undefined> {
    const value = await LocalStorage.getItem<string>(key);
    return typeof value === "string" ? value : undefined;
  }

  async set(key: string, value: string): Promise<void> {
    await LocalStorage.setItem(key, value);
  }
}

export async function getRememberedDestinationRoot(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(DESTINATION_ROOT_KEY);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function rememberDestinationRoot(directory: string): Promise<void> {
  await LocalStorage.setItem(DESTINATION_ROOT_KEY, directory);
}
