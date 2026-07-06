import { LocalStorage } from "@raycast/api";
import type { ApiConfig } from "./types";

const KEY_PREFIX = "api-cfg-";
const TOMB_KEY_PREFIX = "api-tomb-";

export async function getConfigs(): Promise<ApiConfig[]> {
  const all = await LocalStorage.allItems();
  const configs: ApiConfig[] = [];
  for (const [key, raw] of Object.entries(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    try {
      configs.push(JSON.parse(raw as string) as ApiConfig);
    } catch {
      // skip corrupted entries
    }
  }
  return configs;
}

export async function saveConfig(config: ApiConfig, isEdit?: boolean): Promise<void> {
  if (isEdit) {
    // Check tombstone: if another window deleted this config, reject
    const tomb = await LocalStorage.getItem<string>(TOMB_KEY_PREFIX + config.id);
    if (tomb) {
      throw new Error("This station was deleted by another window");
    }
  }
  await LocalStorage.setItem(KEY_PREFIX + config.id, JSON.stringify(config));
}

export async function deleteConfig(id: string): Promise<void> {
  // Set tombstone BEFORE removing data to minimize the race window
  await LocalStorage.setItem(TOMB_KEY_PREFIX + id, "1");
  await LocalStorage.removeItem(KEY_PREFIX + id);
}
