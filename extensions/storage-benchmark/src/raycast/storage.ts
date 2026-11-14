import { environment, LocalStorage } from "@raycast/api";
import { join } from "node:path";
import lockfile from "proper-lockfile";
import { HistoryKeyValueStore } from "../history/history";

const DESTINATION_ROOT_KEY = "benchmark-destination-root-v1";
const HISTORY_LOCK_TARGET = join(environment.supportPath, "history-storage");

export class RaycastHistoryStore implements HistoryKeyValueStore {
  async get(key: string): Promise<string | undefined> {
    const value = await LocalStorage.getItem<string>(key);
    return typeof value === "string" ? value : undefined;
  }

  async set(key: string, value: string): Promise<void> {
    await LocalStorage.setItem(key, value);
  }

  async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const release = await lockfile.lock(HISTORY_LOCK_TARGET, {
      realpath: false,
      stale: 10_000,
      update: 2_000,
      retries: { retries: 50, factor: 1.2, minTimeout: 10, maxTimeout: 100, randomize: true },
    });

    try {
      return await operation();
    } finally {
      await release();
    }
  }
}

export async function getRememberedDestinationRoot(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(DESTINATION_ROOT_KEY);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function rememberDestinationRoot(directory: string): Promise<void> {
  await LocalStorage.setItem(DESTINATION_ROOT_KEY, directory);
}
