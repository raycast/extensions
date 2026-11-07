import { Cache } from "@raycast/api";
import { fetchModels } from "../lib/fm/client";
import { FALLBACK_MODELS } from "../lib/fm/parse";

const CACHE_KEY = "fm-models.v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const cache = new Cache();

interface CachedModels {
  models: string[];
  fetchedAt: number;
}

export async function getModels(): Promise<string[]> {
  const cached = readCache();
  if (cached) return cached;

  try {
    const models = await fetchModels(FETCH_TIMEOUT_MS);
    cache.set(CACHE_KEY, JSON.stringify({ models, fetchedAt: Date.now() } satisfies CachedModels));
    return models;
  } catch {
    return [...FALLBACK_MODELS];
  }
}

function readCache(): string[] | undefined {
  const raw = cache.get(CACHE_KEY);
  if (raw === undefined) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedModels>;
    const valid =
      Array.isArray(parsed.models) &&
      parsed.models.length > 0 &&
      parsed.models.every((model) => typeof model === "string") &&
      typeof parsed.fetchedAt === "number" &&
      Date.now() - parsed.fetchedAt < CACHE_TTL_MS;
    return valid ? parsed.models : undefined;
  } catch {
    return undefined;
  }
}
