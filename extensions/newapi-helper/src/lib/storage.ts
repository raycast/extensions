import { LocalStorage } from "@raycast/api";
import type { ApiConfig } from "./types";

const STORAGE_KEY = "api-configs";

let saveQueue = Promise.resolve();

export async function getConfigs(): Promise<ApiConfig[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ApiConfig[];
  } catch {
    throw new Error("Stored API configs are corrupted");
  }
}

export async function saveConfig(config: ApiConfig): Promise<void> {
  // Advance past any previous failure so the chain never permanently breaks
  try {
    await saveQueue;
  } catch {
    /* ignore stale error */
  }
  saveQueue = (async () => {
    const configs = await getConfigs();
    const idx = configs.findIndex((c) => c.id === config.id);
    if (idx >= 0) {
      configs[idx] = config;
    } else {
      configs.push(config);
    }
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  })();
  await saveQueue;
}

export async function deleteConfig(id: string): Promise<void> {
  try {
    await saveQueue;
  } catch {
    /* ignore stale error */
  }
  saveQueue = (async () => {
    const configs = await getConfigs();
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(configs.filter((c) => c.id !== id)));
  })();
  await saveQueue;
}
