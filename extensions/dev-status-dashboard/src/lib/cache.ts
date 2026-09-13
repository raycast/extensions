import { LocalStorage } from "@raycast/api";
import type { ServiceStatus } from "./providers/types";

// One LocalStorage entry per service (not a single JSON blob) so the dashboard and the menu-bar
// process can't clobber each other's writes — the same race the history pattern avoids elsewhere.
const PREFIX = "dev-status.cache.";
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function keyFor(serviceId: string): string {
  return `${PREFIX}${serviceId}`;
}

async function readCache(serviceId: string): Promise<ServiceStatus | undefined> {
  const raw = await LocalStorage.getItem<string>(keyFor(serviceId));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ServiceStatus;
  } catch {
    return undefined;
  }
}

/** Returns a snapshot only if it exists and is younger than the TTL; otherwise undefined. */
export async function getCached(serviceId: string): Promise<ServiceStatus | undefined> {
  const status = await readCache(serviceId);
  if (!status) return undefined;
  return Date.now() - status.fetchedAt > TTL_MS ? undefined : status;
}

/** Returns the last stored snapshot regardless of age — used as a fallback when a fetch fails. */
export async function getCachedStale(serviceId: string): Promise<ServiceStatus | undefined> {
  return readCache(serviceId);
}

export async function setCached(serviceId: string, status: ServiceStatus): Promise<void> {
  await LocalStorage.setItem(keyFor(serviceId), JSON.stringify(status));
}

/** Drops every cached snapshot so the next load re-fetches from the network (used by Refresh). */
export async function clearCache(): Promise<void> {
  const all = await LocalStorage.allItems();
  const keys = Object.keys(all).filter((key) => key.startsWith(PREFIX));
  await Promise.all(keys.map((key) => LocalStorage.removeItem(key)));
}
