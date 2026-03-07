import { LocalStorage } from "@raycast/api";

export interface CachedService {
  serviceId: string;
  displayName: string;
  lastUsed: number;
  pinned: boolean;
}

const CACHE_KEY = "recent-services";
const MAX_RECENT = 100;

export async function getCachedServices(): Promise<CachedService[]> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addRecentService(
  serviceId: string,
  displayName: string,
): Promise<void> {
  let services = await getCachedServices();
  const existing = services.find((s) => s.serviceId === serviceId);
  if (existing) {
    existing.lastUsed = Date.now();
    existing.displayName = displayName;
  } else {
    services.push({
      serviceId,
      displayName,
      lastUsed: Date.now(),
      pinned: false,
    });
  }
  if (services.length > MAX_RECENT) {
    const pinned = services.filter((s) => s.pinned);
    const unpinned = services.filter((s) => !s.pinned);
    unpinned.sort((a, b) => b.lastUsed - a.lastUsed);
    services = [...pinned, ...unpinned.slice(0, MAX_RECENT - pinned.length)];
  }
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(services));
}

export async function removeService(serviceId: string): Promise<void> {
  const services = await getCachedServices();
  const filtered = services.filter((s) => s.serviceId !== serviceId);
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
}

export async function togglePin(serviceId: string): Promise<void> {
  const services = await getCachedServices();
  const entry = services.find((s) => s.serviceId === serviceId);
  if (entry) {
    entry.pinned = !entry.pinned;
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(services));
  }
}

export function sortServices(services: CachedService[]): CachedService[] {
  return [...services].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.lastUsed - a.lastUsed;
  });
}
