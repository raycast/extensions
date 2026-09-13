import { ApiError } from "./api";
import { UsageCache } from "./cache";
import { picksFor, quotaFor } from "./quota";
import type {
  Catalog,
  CollectResult,
  Failure,
  Model,
  Payload,
  PricingCatalog,
  PricingModel,
  Usage,
} from "./types";

export interface CollectorDeps {
  resolveKey: () => Promise<string | null>;
  fetchUsage: (key: string) => Promise<Usage>;
  fetchGoCatalog: () => Promise<string[]>;
  fetchZenCatalog: () => Promise<string[]>;
  fetchPricing: () => Promise<PricingCatalog>;
  cache: UsageCache;
  now: () => Date;
}

export interface CollectOptions {
  force?: boolean;
}

function fail(type: Failure["type"], message: string): CollectResult {
  return { ok: false, failure: { type, message } };
}

function buildModels(
  ids: string[],
  pricing: PricingModel[],
  withQuota: boolean,
): Model[] {
  const byId = new Map(pricing.map((p) => [p.id, p]));
  return ids.map((id) => {
    const p = byId.get(id);
    if (!p)
      return { id, cost: null, modalities: null, quota: null, isPick: null };
    return {
      id,
      cost: p.cost,
      modalities: p.modalities,
      quota: withQuota ? quotaFor(p.cost) : null,
      isPick: null,
    };
  });
}

function byQuotaDesc(a: Model, b: Model): number {
  return (b.quota ?? -1) - (a.quota ?? -1) || a.id.localeCompare(b.id);
}

function tagPicks(models: Model[], picks: Payload["picks"]): Model[] {
  return models.map((m) => {
    if (m.id === picks?.stretch) return { ...m, isPick: "stretch" as const };
    if (m.id === picks?.bestValue)
      return { ...m, isPick: "best-value" as const };
    return m;
  });
}

export async function collect(
  deps: CollectorDeps,
  opts: CollectOptions = {},
): Promise<CollectResult> {
  const now = deps.now();
  const key = await deps.resolveKey();
  if (!key) {
    return fail(
      "no-key",
      "No API key found. Paste your OpenCode Go API key in Extension Preferences.",
    );
  }

  if (!opts.force) {
    const cached = deps.cache.readLastPayload();
    if (cached && !deps.cache.isUsageStale(cached, now)) {
      return { ok: true, payload: cached, fromCache: true };
    }
  }

  let usage: Usage;
  try {
    usage = await deps.fetchUsage(key);
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.kind === "bad-key" || err.kind === "no-entitlement")
    ) {
      return fail(err.kind, err.message);
    }
    const cached = deps.cache.readLastPayload();
    if (cached)
      return {
        ok: true,
        payload: { ...cached, offline: true },
        fromCache: true,
      };
    return fail("offline", "Can't reach the OpenCode Go API.");
  }

  let goIds: string[];
  try {
    goIds = await deps.fetchGoCatalog();
  } catch {
    goIds = deps.cache.readLastPayload()?.models.go.map((m) => m.id) ?? [];
  }

  let zenIds: string[];
  try {
    zenIds = await deps.fetchZenCatalog();
  } catch {
    zenIds = deps.cache.readLastPayload()?.models.zen.map((m) => m.id) ?? [];
  }

  let pricing: PricingCatalog = deps.cache.readPricing() ?? { go: [], zen: [] };
  if (deps.cache.isPricingStale(now)) {
    try {
      pricing = await deps.fetchPricing();
      deps.cache.writePricing(pricing, now.toISOString());
    } catch {
      // keep whatever pricing we have (stale is better than none)
    }
  }

  const go = buildModels(goIds, pricing.go, true).sort(byQuotaDesc);
  const zen = buildModels(zenIds, pricing.zen, false);

  let picks = deps.cache.readLastPayload()?.picks ?? null;
  if (deps.cache.isPicksStale(now) || !picks) {
    picks = picksFor(go, now);
    deps.cache.setPicksComputedAt(now.toISOString());
  }

  const models: Catalog = { go: tagPicks(go, picks), zen };

  const payload: Payload = {
    windows: usage,
    models,
    picks,
    updatedAt: now.toISOString(),
    offline: false,
  };
  deps.cache.writeLastPayload(payload);
  return { ok: true, payload, fromCache: false };
}
