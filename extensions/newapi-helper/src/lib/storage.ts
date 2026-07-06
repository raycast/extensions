import { LocalStorage } from "@raycast/api";
import type { ApiConfig } from "./types";

const KEY_PREFIX = "api-cfg-";

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

export async function saveConfig(config: ApiConfig): Promise<void> {
  await LocalStorage.setItem(KEY_PREFIX + config.id, JSON.stringify(config));
}

export async function deleteConfig(id: string): Promise<void> {
  await LocalStorage.removeItem(KEY_PREFIX + id);
}
