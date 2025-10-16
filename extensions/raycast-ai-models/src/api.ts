import { LocalStorage } from "@raycast/api";

export type Availability = "public" | "private" | string;

export type Capabilities = Record<string, unknown>;

export type Abilities = {
  web_search?: { toggleable?: boolean; native?: boolean };
  image_generation?: { model?: string };
  vision?: { formats?: string[] };
  system_message?: { supported?: boolean };
  temperature?: { supported?: boolean };
  tools?: { supported?: boolean; limit?: number };
  reasoning_effort?: { supported?: boolean; options?: string[]; default?: string };
  streaming?: { supported?: boolean };
  thinking?: { supported?: boolean };
  [key: string]: unknown;
};

// Split Model into required base fields and optional extension fields to improve type safety
export type ModelBase = {
  id: string;
  name: string;
  // keep description nullable to mirror API
  description: string | null;
  // features list may be empty but present
  features: string[];
  // core capabilities object
  capabilities: Capabilities;
};

export type ModelOptional = {
  status?: string | null;
  suggestions?: string[];
  in_better_ai_subscription?: boolean;
  model?: string;
  provider?: string;
  provider_name?: string;
  provider_brand?: string;
  abilities?: Abilities;
  availability?: Availability;
  speed?: number; // lower is faster in this dataset (1 = fastest)
  intelligence?: number; // numeric score, higher = more intelligent
  requires_better_ai?: boolean;
  context?: number;
  [key: string]: unknown;
};

export type Model = ModelBase & Partial<ModelOptional>;

export const API_URL = "https://www.raycast.com/api/web-ai/models";
const CACHE_KEY = "raycast-models-cache";
const CACHE_TIMESTAMP_KEY = "raycast-models-cache-timestamp";

let cachedModels: Model[] | null = null;
let cacheTimestamp = 0;

// Tunable constants (exported so they can be imported and tested)
export const INTELLIGENCE_WEIGHT = 0.6;
export const SPEED_WEIGHT = 0.4;
export const DEFAULT_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
export const RETRY_COUNT = 2; // number of retries on transient failures
export const RETRY_BASE_DELAY_MS = 300; // base delay for exponential backoff

const CACHE_TTL = DEFAULT_CACHE_TTL;

// Load cached payload from Raycast LocalStorage. Returns null payload on failure.
async function loadFromStorage(): Promise<{ models: Model[] | null; timestamp: number }> {
  try {
    const [stored, timestampValue] = await Promise.all([
      LocalStorage.getItem<string>(CACHE_KEY),
      LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY),
    ]);
    if (stored && timestampValue) {
      const parsedTimestamp = Number.parseInt(timestampValue, 10);
      if (!Number.isNaN(parsedTimestamp)) {
        return { models: JSON.parse(stored), timestamp: parsedTimestamp };
      }
    }
  } catch (e) {
    console.error("Failed to load from LocalStorage:", e);
  }
  return { models: null, timestamp: 0 };
}

// Persist cache payload to Raycast LocalStorage.
async function saveToStorage(models: Model[], timestamp: number): Promise<void> {
  try {
    await Promise.all([
      LocalStorage.setItem(CACHE_KEY, JSON.stringify(models)),
      LocalStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString()),
    ]);
  } catch (e) {
    console.error("Failed to save to LocalStorage:", e);
  }
}

export async function fetchModels({ force = false } = {}): Promise<Model[]> {
  // Try memory cache first
  if (!force && cachedModels && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedModels;
  }

  // Try LocalStorage cache if memory cache is empty
  if (!cachedModels) {
    const stored = await loadFromStorage();
    if (stored.models && Date.now() - stored.timestamp < CACHE_TTL) {
      cachedModels = stored.models;
      cacheTimestamp = stored.timestamp;
      return stored.models;
    }
  }

  // Fetch with basic retry/backoff for transient errors
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Validate response shape: either Model[] or { models: Model[] }
      let models: Model[] | undefined;
      const looksLikeModelsObject = (v: unknown): v is { models: unknown } =>
        !!v && typeof v === "object" && Array.isArray((v as { models?: unknown }).models);

      if (Array.isArray(data)) {
        models = data as Model[];
      } else if (looksLikeModelsObject(data)) {
        models = (data as { models: Model[] }).models;
      } else {
        throw new Error("Unexpected API response structure: expected an array or { models: Model[] }");
      }

      cachedModels = models;
      cacheTimestamp = Date.now();
      await saveToStorage(models, cacheTimestamp);
      return models;
    } catch (e) {
      lastError = e as Error;
      // if last attempt, rethrow
      if (attempt === RETRY_COUNT) break;
      // exponential backoff
      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error("Unknown error while fetching models");
}

export type SortBy =
  | "intelligence"
  | "speed"
  | "name"
  | "intelligence_then_speed"
  | "speed_then_intelligence"
  | "combined";

function numericValue(v: unknown, fallback = -Infinity): number {
  return typeof v === "number" ? v : fallback;
}

// normalize numbers to 0..1 given min/max
function normalize(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

export function sortModels(models: Model[], by: SortBy, desc = true): Model[] {
  const arr = [...models];

  if (by === "name") {
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (by === "intelligence") {
    return arr.sort((a, b) =>
      desc
        ? numericValue(b.intelligence) - numericValue(a.intelligence)
        : numericValue(a.intelligence) - numericValue(b.intelligence),
    );
  }

  if (by === "speed") {
    // speed: lower number = faster. When desc=true we show slowest-first (higher numbers first)
    return arr.sort((a, b) =>
      desc ? numericValue(b.speed) - numericValue(a.speed) : numericValue(a.speed) - numericValue(b.speed),
    );
  }

  if (by === "intelligence_then_speed") {
    return arr.sort((a, b) => {
      const ia = numericValue(a.intelligence);
      const ib = numericValue(b.intelligence);
      if (ib !== ia) return desc ? ib - ia : ia - ib;
      // tie-breaker: prefer faster (lower speed) when ascending, or slower when desc
      const sa = numericValue(a.speed);
      const sb = numericValue(b.speed);
      return desc ? sb - sa : sa - sb;
    });
  }

  if (by === "speed_then_intelligence") {
    return arr.sort((a, b) => {
      const sa = numericValue(a.speed);
      const sb = numericValue(b.speed);
      if (sb !== sa) return desc ? sb - sa : sa - sb;
      const ia = numericValue(a.intelligence);
      const ib = numericValue(b.intelligence);
      return desc ? ib - ia : ia - ib;
    });
  }

  // combined: normalize speed (invert so higher is better) and intelligence to 0..1, then weighted sum
  if (by === "combined") {
    const ints = arr.map((m) => numericValue(m.intelligence, 0));
    const speeds = arr.map((m) => numericValue(m.speed, 0));
    // since lower speed = faster, invert speed for 'quality'
    const invSpeeds = speeds.map((s) => -s);
    const nInt = normalize(ints);
    const nSpeed = normalize(invSpeeds);
    // weighted sum using named constants (tunable)
    const weights = arr.map((_, i) => INTELLIGENCE_WEIGHT * nInt[i] + SPEED_WEIGHT * nSpeed[i]);
    // precompute weight map for O(1) lookup instead of O(n) indexOf
    const weightMap = new Map(arr.map((m, i) => [m.id, weights[i]]));
    return arr.sort((a, b) => {
      const va = weightMap.get(a.id) ?? 0;
      const vb = weightMap.get(b.id) ?? 0;
      return desc ? vb - va : va - vb;
    });
  }

  return arr;
}

export async function clearCache(): Promise<void> {
  cachedModels = null;
  cacheTimestamp = 0;
  try {
    await Promise.all([LocalStorage.removeItem(CACHE_KEY), LocalStorage.removeItem(CACHE_TIMESTAMP_KEY)]);
  } catch (e) {
    console.error("Failed to clear LocalStorage cache:", e);
  }
}
