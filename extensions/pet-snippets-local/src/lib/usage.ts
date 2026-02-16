import { LocalStorage } from "@raycast/api";

const LAST_USED_STORAGE_KEY = "pet-snippets-last-used-v1";

export type LastUsedMap = Record<string, number>;

function parseLastUsedMap(raw: LocalStorage.Value | undefined): LastUsedMap {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map: LastUsedMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        map[key] = value;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function loadLastUsedMap(): Promise<LastUsedMap> {
  const raw = await LocalStorage.getItem(LAST_USED_STORAGE_KEY);
  return parseLastUsedMap(raw);
}

export async function saveLastUsedMap(lastUsed: LastUsedMap): Promise<void> {
  await LocalStorage.setItem(LAST_USED_STORAGE_KEY, JSON.stringify(lastUsed));
}
