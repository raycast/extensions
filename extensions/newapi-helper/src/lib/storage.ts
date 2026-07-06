import { LocalStorage } from "@raycast/api";
import type { ApiConfig } from "./types";

const STORAGE_KEY = "api-configs";

export async function getConfigs(): Promise<ApiConfig[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ApiConfig[];
  } catch {
    throw new Error("Stored API configs are corrupted");
  }
}

let saveLock = false;
let saveQueue: Promise<void> = Promise.resolve();

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  while (saveLock) {
    const { promise, resolve } = Promise.withResolvers<void>();
    const next = saveQueue.then(resolve);
    saveQueue = next;
    await promise;
  }
  saveLock = true;
  try {
    return await fn();
  } finally {
    saveLock = false;
  }
}

export async function saveConfig(config: ApiConfig): Promise<void> {
  await withLock(async () => {
    const configs = await getConfigs();
    const idx = configs.findIndex((c) => c.id === config.id);
    if (idx >= 0) {
      configs[idx] = config;
    } else {
      configs.push(config);
    }
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  });
}

export async function deleteConfig(id: string): Promise<void> {
  await withLock(async () => {
    const configs = await getConfigs();
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(configs.filter((c) => c.id !== id)));
  });
}
