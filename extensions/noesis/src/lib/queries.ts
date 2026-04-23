import path from "node:path";
import { environment } from "@raycast/api";
import { calculateEngine, fetchRemoteSnapshot, normalizeBaseUrl } from "./api";
import { createNoesisCacheRepository } from "./cache";
import {
  buildMenuBarInsight,
  buildMenuBarInsightPlans,
  mapMenuBarInsights,
} from "./menu-bar-insights";
import {
  DashboardSnapshot,
  MenuBarSnapshot,
  SelemeneClientConfig,
} from "./types";
import {
  DEFAULT_BASE_URL,
  getStoredBaseUrl,
  getStoredConfig,
} from "./settings";

const CACHE_TTL_MS = {
  service: 60 * 1000,
  profile: 60 * 60 * 1000,
  usage: 10 * 60 * 1000,
  catalog: 6 * 60 * 60 * 1000,
  readings: 5 * 60 * 1000,
};

export async function readDashboardSnapshot(): Promise<DashboardSnapshot> {
  const config = await getStoredConfig();
  const baseUrl =
    config?.baseUrl ?? (await getStoredBaseUrl()) ?? DEFAULT_BASE_URL;
  const repository = getCacheRepository();
  const snapshot = repository.readSnapshot(
    normalizeBaseUrl(baseUrl),
    Boolean(config),
  );
  return decorateSnapshot(snapshot);
}

export async function readMenuBarSnapshot(): Promise<MenuBarSnapshot> {
  const dashboard = await readDashboardSnapshot();
  const repository = getCacheRepository();

  return {
    dashboard,
    insights: mapMenuBarInsights(repository.readMenuBarInsights()),
  };
}

export function clearDashboardCache(): void {
  getCacheRepository().clearAll();
}

export async function syncDashboardSnapshot(
  options: {
    force?: boolean;
    configOverride?: SelemeneClientConfig;
  } = {},
): Promise<DashboardSnapshot> {
  const repository = getCacheRepository();
  const config = options.configOverride ?? (await getStoredConfig());
  const baseUrl =
    config?.baseUrl ?? (await getStoredBaseUrl()) ?? DEFAULT_BASE_URL;
  const cached = decorateSnapshot(
    repository.readSnapshot(normalizeBaseUrl(baseUrl), Boolean(config)),
  );

  if (!config) {
    return cached;
  }

  const refreshPlan = {
    includeService:
      options.force || isStale(cached.timestamps.service, CACHE_TTL_MS.service),
    includeCatalog:
      options.force || isStale(cached.timestamps.catalog, CACHE_TTL_MS.catalog),
    includeProfile:
      options.force || isStale(cached.timestamps.profile, CACHE_TTL_MS.profile),
    includeUsage:
      options.force || isStale(cached.timestamps.usage, CACHE_TTL_MS.usage),
    includeReadings:
      options.force ||
      isStale(cached.timestamps.readings, CACHE_TTL_MS.readings),
  };

  if (!Object.values(refreshPlan).some(Boolean)) {
    return { ...cached, hasCredentials: true };
  }

  try {
    const remote = await fetchRemoteSnapshot(config, refreshPlan);
    repository.saveRemoteSnapshot(remote);
    return decorateSnapshot(
      repository.readSnapshot(config.baseUrl, true),
      "live",
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to refresh Selemene data";
    if (hasAnyData(cached)) {
      return decorateSnapshot({ ...cached, syncError: message }, "cache");
    }

    throw error;
  }
}

export async function syncMenuBarSnapshot(
  options: { force?: boolean } = {},
): Promise<MenuBarSnapshot> {
  const repository = getCacheRepository();
  const dashboard = await syncDashboardSnapshot({ force: options.force });
  const cachedInsights = mapMenuBarInsights(repository.readMenuBarInsights());
  const config = await getStoredConfig();

  if (!config) {
    return {
      dashboard,
      insights: cachedInsights,
    };
  }

  const plans = buildMenuBarInsightPlans(
    dashboard,
    cachedInsights,
    new Date(),
    options.force,
  );

  if (plans.length === 0) {
    return {
      dashboard,
      insights: cachedInsights,
    };
  }

  const settled = await Promise.allSettled(
    plans.map(async (plan) => {
      const result = await calculateEngine(config, plan.engineId, plan.input);
      return buildMenuBarInsight(plan.kind, result, new Date().toISOString());
    }),
  );

  const successful = settled
    .filter(
      (
        entry,
      ): entry is PromiseFulfilledResult<
        ReturnType<typeof buildMenuBarInsight>
      > => entry.status === "fulfilled",
    )
    .map((entry) => entry.value);
  const failures = settled
    .filter(
      (entry): entry is PromiseRejectedResult => entry.status === "rejected",
    )
    .map((entry) =>
      entry.reason instanceof Error
        ? entry.reason.message
        : "Unable to refresh menu bar insight",
    );

  if (successful.length > 0) {
    repository.saveMenuBarInsights(successful);
  }

  return {
    dashboard,
    insights: {
      ...cachedInsights,
      ...mapMenuBarInsights(successful),
    },
    syncError: failures[0],
  };
}

export function getCacheDatabasePath(): string {
  return path.join(environment.supportPath, "noesis-cache.sqlite");
}

function getCacheRepository() {
  return createNoesisCacheRepository(getCacheDatabasePath());
}

function decorateSnapshot(
  snapshot: DashboardSnapshot,
  source: DashboardSnapshot["source"] = "cache",
): DashboardSnapshot {
  const hasData = hasAnyData(snapshot);
  const cacheState = !hasData
    ? "empty"
    : snapshot.hasCredentials
      ? anyStale(snapshot)
        ? "stale"
        : source === "live"
          ? "fresh"
          : snapshot.cacheState
      : "cached";

  return {
    ...snapshot,
    source: hasData ? source : "empty",
    cacheState,
  };
}

function anyStale(snapshot: DashboardSnapshot): boolean {
  return (
    isStale(snapshot.timestamps.service, CACHE_TTL_MS.service) ||
    isStale(snapshot.timestamps.profile, CACHE_TTL_MS.profile) ||
    isStale(snapshot.timestamps.usage, CACHE_TTL_MS.usage) ||
    isStale(snapshot.timestamps.catalog, CACHE_TTL_MS.catalog) ||
    isStale(snapshot.timestamps.readings, CACHE_TTL_MS.readings)
  );
}

function isStale(timestamp: string | undefined, ttlMs: number): boolean {
  if (!timestamp) {
    return true;
  }

  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) || Date.now() - parsed > ttlMs;
}

function hasAnyData(snapshot: DashboardSnapshot): boolean {
  return Boolean(
    snapshot.health ||
    snapshot.profile ||
    snapshot.usage ||
    snapshot.workflows.length ||
    snapshot.engines.length ||
    snapshot.readings.length,
  );
}
