import {
  Cache,
  closeMainWindow,
  environment,
  getPreferenceValues,
  LaunchType,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { API_RANDOM_URL, setDesktopWallpaper, Wallpaper } from "./utils";

const CACHE_KEY_LAST_REFRESH_TIME = "lastRefreshTime";
const CACHE_KEY_RECENT_IDS = "recentIds";
const RECENT_IDS_CAP = 5;
const FETCH_RETRY_ATTEMPTS = 3;

const cache = new Cache();

function readRecentIds(): string[] {
  const raw = cache.get(CACHE_KEY_RECENT_IDS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function pushRecentId(id: string) {
  const next = [...readRecentIds().filter((existing) => existing !== id), id];
  cache.set(CACHE_KEY_RECENT_IDS, JSON.stringify(next.slice(-RECENT_IDS_CAP)));
}

async function fetchRandomWallpaper(): Promise<Wallpaper> {
  const response = await fetch(API_RANDOM_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch wallpaper: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as Wallpaper;
}

async function pickWallpaperAvoidingRecents(): Promise<Wallpaper> {
  const recents = readRecentIds();
  let candidate: Wallpaper | null = null;
  for (let attempt = 0; attempt < FETCH_RETRY_ATTEMPTS; attempt++) {
    candidate = await fetchRandomWallpaper();
    if (!recents.includes(candidate.id)) {
      return candidate;
    }
  }
  // All attempts collided — accept the last one rather than spin on small catalogs.
  return candidate as Wallpaper;
}

export default async function Command() {
  const preferences = getPreferenceValues();
  const refreshInterval = Number(preferences.refreshIntervalSeconds) || 3600;
  const isManual = environment.launchType === LaunchType.UserInitiated;

  if (!isManual) {
    const lastRefresh = Number(cache.get(CACHE_KEY_LAST_REFRESH_TIME) ?? 0);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (lastRefresh && nowSeconds < lastRefresh + refreshInterval) {
      return;
    }
  }

  if (isManual) {
    await showHUD("Switching wallpaper...");
  }

  try {
    const wallpaper = await pickWallpaperAvoidingRecents();
    await setDesktopWallpaper(wallpaper.url, wallpaper.id);

    cache.set(CACHE_KEY_LAST_REFRESH_TIME, `${Math.floor(Date.now() / 1000)}`);
    pushRecentId(wallpaper.id);

    const successMessage = `${wallpaper.name} by ${wallpaper.artist}`;
    if (isManual) {
      await showHUD(successMessage);
      await closeMainWindow({ clearRootSearch: true });
      await popToRoot({ clearSearchBar: true });
    } else if (preferences.notifyOnSwitch) {
      await showHUD(successMessage);
    }
  } catch (error) {
    if (isManual) {
      const message = error instanceof Error ? error.message : String(error);
      await showHUD(`Failed to set wallpaper: ${message}`);
    } else {
      console.error("Auto switch wallpaper error:", error);
    }
  }
}
