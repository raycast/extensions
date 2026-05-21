import { LocalStorage, Cache } from "@raycast/api";
import { AppDetails, PersistedDetails } from "./types";
import { CACHE_TTL } from "./constants";

const iconUrlCache = new Cache({ namespace: "icon-urls" });
const homeCache = new Cache({ namespace: "home-subtitles" });

export function getCachedSubtitle(key: string, ttl = CACHE_TTL): string | null {
  const raw = homeCache.get(key);
  if (!raw) return null;
  try {
    const { value, timestamp }: { value: string; timestamp: number } =
      JSON.parse(raw);
    if (Date.now() - timestamp > ttl) return null;
    return value;
  } catch {
    return null;
  }
}

export function setCachedSubtitle(key: string, value: string): void {
  homeCache.set(key, JSON.stringify({ value, timestamp: Date.now() }));
}

export function getIconUrl(appId: number): string | undefined {
  return iconUrlCache.get(String(appId));
}

export function setIconUrl(appId: number, url: string): void {
  iconUrlCache.set(String(appId), url);
}
export const memoryCache = new Map<string, AppDetails>();

export async function loadPersistedDetails(
  appId: number,
  region: string,
): Promise<AppDetails | null> {
  try {
    const raw = await LocalStorage.getItem<string>(`d-${appId}-${region}`);
    if (!raw) return null;
    const { details, timestamp }: PersistedDetails = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return details;
  } catch {
    return null;
  }
}

export async function persistDetails(
  appId: number,
  region: string,
  details: AppDetails,
): Promise<void> {
  try {
    await LocalStorage.setItem(
      `d-${appId}-${region}`,
      JSON.stringify({ details, timestamp: Date.now() } as PersistedDetails),
    );
  } catch {
    // Silently ignore persistence errors
  }
}
