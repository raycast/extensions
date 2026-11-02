import { Cache } from "@raycast/api";

// Command Code's /models has no capability fields, so they come from models.dev, the open model catalog.
// Each model is listed by many providers there; a majority vote smooths out individual listing mistakes.
const MODELS_DEV_URL = "https://models.dev/api.json";
const CACHE_KEY = "capabilities";
const TTL = 60 * 60 * 1000;

export interface Capabilities {
  vision: boolean;
  tools: boolean;
  temperature: boolean;
  /** Most commonly listed output token limit. */
  maxOutputTokens?: number;
  /** Reasoning effort levels, when the model takes an effort setting. */
  efforts?: string[];
}

type Index = Record<string, Capabilities>;

interface ModelsDevModel {
  modalities?: { input?: string[] };
  tool_call?: boolean;
  temperature?: boolean;
  limit?: { output?: number };
  reasoning_options?: { type?: string; values?: (string | null)[] }[];
}

type ModelsDev = Record<string, { models?: Record<string, ModelsDevModel> }>;

interface CachedIndex {
  fetchedAt: number;
  etag: string | null;
  index: Index;
}

const cache = new Cache();

function readCache(): CachedIndex | undefined {
  const raw = cache.get(CACHE_KEY);
  return raw ? (JSON.parse(raw) as CachedIndex) : undefined;
}

/** Whatever was last fetched, however old: requests shouldn't wait on models.dev. Refreshed by `getModels`. */
export function cachedCapabilities(): Index {
  return readCache()?.index ?? {};
}

export async function loadCapabilities(): Promise<Index> {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < TTL) return cached.index;
  try {
    const res = await fetch(MODELS_DEV_URL, {
      headers: cached?.etag ? { "If-None-Match": cached.etag } : {},
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 304 && cached) return save({ ...cached, fetchedAt: Date.now() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return save({ fetchedAt: Date.now(), etag: res.headers.get("etag"), index: buildIndex(await res.json()) });
  } catch {
    // Capabilities are optional; models still load without them.
    return cached?.index ?? {};
  }
}

function save(value: CachedIndex): Index {
  cache.set(CACHE_KEY, JSON.stringify(value));
  return value.index;
}

/** Command Code IDs are either bare (`gpt-5.5`) or vendor-prefixed (`zai-org/GLM-5.3`); match either way. */
export function lookupCapabilities(index: Index, modelId: string): Capabilities | undefined {
  const id = modelId.toLowerCase();
  return index[id] ?? index[id.slice(id.lastIndexOf("/") + 1)];
}

export function buildIndex(catalog: ModelsDev): Index {
  const listings = new Map<string, ModelsDevModel[]>();
  for (const provider of Object.values(catalog)) {
    for (const [id, model] of Object.entries(provider.models ?? {})) {
      const lower = id.toLowerCase();
      for (const key of new Set([lower, lower.slice(lower.lastIndexOf("/") + 1)])) {
        listings.set(key, [...(listings.get(key) ?? []), model]);
      }
    }
  }

  const index: Index = {};
  for (const [key, models] of listings) {
    const vision = majority(models, (m) => m.modalities?.input?.includes("image"));
    // Listings that leave these out don't count against them.
    const tools = majority(
      models.filter((m) => m.tool_call !== undefined),
      (m) => m.tool_call,
      true,
    );
    const temperature = majority(
      models.filter((m) => m.temperature !== undefined),
      (m) => m.temperature,
      true,
    );
    const outputs = models.flatMap((m) => (m.limit?.output ? [String(m.limit.output)] : []));
    const maxOutputTokens = outputs.length ? Number(mostCommon(outputs)) : undefined;
    // Only offer effort levels when most listings with reasoning options describe an effort setting
    // (rather than e.g. a token budget), then take the most commonly listed set of levels.
    const withOptions = models.filter((m) => m.reasoning_options?.length);
    const effortSets = withOptions.flatMap((m) => {
      const values = m.reasoning_options?.find((o) => o.type === "effort")?.values?.filter((v): v is string => !!v);
      return values?.length ? [values.join(",")] : [];
    });
    const efforts = effortSets.length * 2 > withOptions.length ? mostCommon(effortSets).split(",") : undefined;
    index[key] = { vision, tools, temperature, maxOutputTokens, efforts };
  }
  return index;
}

function majority(models: ModelsDevModel[], test: (m: ModelsDevModel) => boolean | undefined, empty = false) {
  return models.length ? models.filter(test).length * 2 > models.length : empty;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}
