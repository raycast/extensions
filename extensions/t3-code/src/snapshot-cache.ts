import { Cache } from "@raycast/api";
import { OrchestrationProject, ServerProvider, ThreadSummary } from "./types";

const CACHE_VERSION = 1;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new Cache({
  namespace: "orchestration-projections",
  capacity: 8 * 1024 * 1024,
});

export interface ProjectOverviewCacheEntry {
  projects: OrchestrationProject[];
  threadCounts: Map<string, number>;
  hasRunning: Map<string, boolean>;
  cachedAt: string;
}

export interface ProjectThreadsCacheEntry {
  threads: ThreadSummary[];
  project: OrchestrationProject | null;
  cachedAt: string;
}

export interface ProviderCatalogCacheEntry {
  providers: ServerProvider[];
  cachedAt: string;
}

interface StoredProjectOverview {
  version: number;
  cachedAt: string;
  projects: OrchestrationProject[];
  threadCounts: Array<[string, number]>;
  runningProjectIds: string[];
}

interface StoredProjectThreads {
  version: number;
  cachedAt: string;
  threads: ThreadSummary[];
  project: OrchestrationProject | null;
}

interface StoredProviderCatalog {
  version: number;
  cachedAt: string;
  providers: ServerProvider[];
}

export function readCachedProjectOverview(
  baseUrl: string,
): ProjectOverviewCacheEntry | null {
  const stored = readCache<StoredProjectOverview>(projectOverviewKey(baseUrl));
  if (!stored) return null;
  return {
    projects: stored.projects,
    threadCounts: new Map(stored.threadCounts),
    hasRunning: new Map(stored.runningProjectIds.map((id) => [id, true])),
    cachedAt: stored.cachedAt,
  };
}

export function writeCachedProjectOverview(
  baseUrl: string,
  entry: Omit<ProjectOverviewCacheEntry, "cachedAt">,
): void {
  writeCache<StoredProjectOverview>(projectOverviewKey(baseUrl), {
    version: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    projects: entry.projects,
    threadCounts: Array.from(entry.threadCounts.entries()),
    runningProjectIds: Array.from(entry.hasRunning.entries())
      .filter(([, running]) => running)
      .map(([id]) => id),
  });
}

export function readCachedProjectThreads(
  baseUrl: string,
  projectId: string,
): ProjectThreadsCacheEntry | null {
  const stored = readCache<StoredProjectThreads>(
    projectThreadsKey(baseUrl, projectId),
  );
  if (!stored) return null;
  return {
    threads: stored.threads,
    project: stored.project,
    cachedAt: stored.cachedAt,
  };
}

export function writeCachedProjectThreads(
  baseUrl: string,
  projectId: string,
  entry: Omit<ProjectThreadsCacheEntry, "cachedAt">,
): void {
  writeCache<StoredProjectThreads>(projectThreadsKey(baseUrl, projectId), {
    version: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    threads: entry.threads,
    project: entry.project,
  });
}

export function readCachedProviderCatalog(
  baseUrl: string,
): ProviderCatalogCacheEntry | null {
  const stored = readCache<StoredProviderCatalog>(providerCatalogKey(baseUrl));
  if (!stored) return null;
  return { providers: stored.providers, cachedAt: stored.cachedAt };
}

export function writeCachedProviderCatalog(
  baseUrl: string,
  providers: ServerProvider[],
): void {
  writeCache<StoredProviderCatalog>(providerCatalogKey(baseUrl), {
    version: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    providers,
  });
}

function readCache<T extends { version: number; cachedAt: string }>(
  key: string,
): T | null {
  const raw = cache.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as T;
    if (parsed.version !== CACHE_VERSION || isExpired(parsed.cachedAt)) {
      cache.remove(key);
      return null;
    }
    return parsed;
  } catch {
    cache.remove(key);
    return null;
  }
}

function writeCache<T>(key: string, value: T): void {
  try {
    cache.set(key, JSON.stringify(value));
  } catch {
    cache.remove(key);
  }
}

function isExpired(cachedAt: string): boolean {
  const time = Date.parse(cachedAt);
  return !Number.isFinite(time) || Date.now() - time > CACHE_MAX_AGE_MS;
}

function projectOverviewKey(baseUrl: string): string {
  return `projects:${hash(baseUrl)}`;
}

function projectThreadsKey(baseUrl: string, projectId: string): string {
  return `project-threads:${hash(baseUrl)}:${hash(projectId)}`;
}

function providerCatalogKey(baseUrl: string): string {
  return `provider-catalog:${hash(baseUrl)}`;
}

function hash(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 33) ^ value.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}
