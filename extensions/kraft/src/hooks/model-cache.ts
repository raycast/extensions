import { LocalStorage } from "@raycast/api";
import { ApiSettings } from "../runtime/api-settings";
import { ModelOption } from "../runtime/model-list";

const STORAGE_KEY = "modelListCache.v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface ModelListCacheEntry {
  key: string;
  models: ModelOption[];
  updatedAt: string;
}

function cacheKey(settings: Pick<ApiSettings, "apiBase" | "apiCompatible">) {
  return `${settings.apiCompatible}:${settings.apiBase}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function parseCache(raw: string | undefined): Record<string, ModelListCacheEntry> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (!isObject(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(([, entry]) => {
        return (
          isObject(entry) &&
          typeof entry.key === "string" &&
          typeof entry.updatedAt === "string" &&
          Array.isArray(entry.models)
        );
      }),
    ) as Record<string, ModelListCacheEntry>;
  } catch {
    return {};
  }
}

export function isModelCacheFresh(entry: ModelListCacheEntry | undefined, now = Date.now()) {
  if (!entry) {
    return false;
  }
  return now - new Date(entry.updatedAt).getTime() < CACHE_TTL_MS;
}

export async function readModelListCache(settings: Pick<ApiSettings, "apiBase" | "apiCompatible">) {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  return parseCache(raw)[cacheKey(settings)];
}

export async function writeModelListCache(
  settings: Pick<ApiSettings, "apiBase" | "apiCompatible">,
  models: ModelOption[],
) {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  const cache = parseCache(raw);
  const key = cacheKey(settings);
  cache[key] = {
    key,
    models,
    updatedAt: new Date().toISOString(),
  };
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  return cache[key];
}
