import { LocalStorage } from "@raycast/api";
import { AppDetails, PersistedDetails } from "./types";
import { CACHE_TTL } from "./constants";

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
  } catch (e) {
    // Silently ignore persistence errors
  }
}
