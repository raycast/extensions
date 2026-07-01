import { Cache } from "@raycast/api";
import type { AirPodsBattery } from "./bluetooth";

const CACHE_KEY = "last-successful-airpods-battery";
const cache = new Cache();

export function getCachedBattery(): AirPodsBattery | undefined {
  const cachedValue = cache.get(CACHE_KEY);

  if (!cachedValue) {
    return undefined;
  }

  try {
    return JSON.parse(cachedValue) as AirPodsBattery;
  } catch {
    cache.remove(CACHE_KEY);
    return undefined;
  }
}

export function setCachedBattery(battery: AirPodsBattery): void {
  cache.set(CACHE_KEY, JSON.stringify(battery));
}
