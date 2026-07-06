import { LocalStorage } from "@raycast/api";
import type { ApiConfig } from "./types";

const KEY_PREFIX = "api-cfg-";
const TOMB_KEY_PREFIX = "api-tomb-";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseConfig(raw: unknown): ApiConfig | null {
  if (!isRecord(raw)) return null;

  const { id, name, baseUrl, accessToken, userId, createdAt, updatedAt } = raw;
  if (typeof id !== "string") return null;
  if (typeof name !== "string") return null;
  if (typeof baseUrl !== "string") return null;
  if (typeof accessToken !== "string") return null;
  if (typeof userId !== "string") return null;
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) return null;

  const resolvedUpdatedAt = typeof updatedAt === "number" && Number.isFinite(updatedAt) ? updatedAt : createdAt;

  return {
    id,
    name,
    baseUrl,
    accessToken,
    userId,
    createdAt,
    updatedAt: resolvedUpdatedAt,
  };
}

export async function getConfigs(): Promise<ApiConfig[]> {
  const all = await LocalStorage.allItems();
  const configs: ApiConfig[] = [];
  for (const [key, raw] of Object.entries(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const id = key.slice(KEY_PREFIX.length);
    if (all[TOMB_KEY_PREFIX + id]) continue;

    try {
      const parsed = parseConfig(JSON.parse(String(raw)));
      if (parsed) {
        configs.push(parsed);
      }
    } catch {
      // skip corrupted entries
    }
  }
  return configs;
}

export async function saveConfig(config: ApiConfig, isEdit?: boolean): Promise<void> {
  const storageKey = KEY_PREFIX + config.id;

  if (isEdit) {
    const tomb = await LocalStorage.getItem<string>(TOMB_KEY_PREFIX + config.id);
    if (tomb) {
      throw new Error("This station was deleted by another window");
    }

    const currentRaw = await LocalStorage.getItem<string>(storageKey);
    if (!currentRaw) {
      throw new Error("This station no longer exists. Re-open it and try again.");
    }

    let currentConfig: ApiConfig | null = null;
    try {
      currentConfig = parseConfig(JSON.parse(String(currentRaw)));
    } catch {
      currentConfig = null;
    }

    if (!currentConfig) {
      throw new Error("This station is corrupted in storage. Delete it and add it again.");
    }

    if (currentConfig.updatedAt !== config.updatedAt) {
      throw new Error("This station was updated by another window. Re-open it and try again.");
    }
  }

  await LocalStorage.setItem(storageKey, JSON.stringify({ ...config, updatedAt: Date.now() }));

  const tomb = await LocalStorage.getItem<string>(TOMB_KEY_PREFIX + config.id);
  if (tomb) {
    await LocalStorage.removeItem(storageKey);
    throw new Error("This station was deleted by another window");
  }
}

export async function deleteConfig(id: string): Promise<void> {
  // Tombstone written FIRST so concurrent saves detect the delete.
  await LocalStorage.setItem(TOMB_KEY_PREFIX + id, "1");
  await LocalStorage.removeItem(KEY_PREFIX + id);
}
