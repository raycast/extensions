import { getPreferenceValues } from "@raycast/api";
import { keyFingerprint, resolveApiKey } from "./auth";
import { fetchCatalog, fetchPricing, fetchUsage } from "./api";
import { UsageCache } from "./cache";
import { collect, type CollectorDeps } from "./collector";
import { createSyncedStorage } from "./storage";
import type { CollectResult } from "./types";

const GO_BASE_URL = "https://opencode.ai/zen/go/v1";
const ZEN_BASE_URL = "https://opencode.ai/zen/v1";
const MODELS_DEV = "https://models.dev/api.json";

export function maxModelsFromPreferences(): number {
  const raw = getPreferenceValues<Preferences>().maxModels;
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 12;
}

function makeDeps(): CollectorDeps {
  const storage = createSyncedStorage();
  return {
    resolveKey: () =>
      Promise.resolve(resolveApiKey(getPreferenceValues<Preferences>().apiKey)),
    fetchUsage: (key) => fetchUsage(key, GO_BASE_URL),
    fetchGoCatalog: () => fetchCatalog(GO_BASE_URL),
    fetchZenCatalog: () => fetchCatalog(ZEN_BASE_URL),
    fetchPricing: () => fetchPricing(MODELS_DEV),
    cache: new UsageCache(storage),
    now: () => new Date(),
  };
}

// Synchronous read of the last-known payload — renders instantly on first paint.
export function readInitialPayload(): CollectResult | undefined {
  const cache = new UsageCache(createSyncedStorage());
  const payload = cache.readLastPayload();
  if (!payload) return undefined;
  const key = resolveApiKey(getPreferenceValues<Preferences>().apiKey);
  if (!key || !cache.isKeyScopeCurrent(keyFingerprint(key))) return undefined;
  return { ok: true, payload, fromCache: true };
}

export async function collectUsage(force = false): Promise<CollectResult> {
  return collect(makeDeps(), { force });
}
