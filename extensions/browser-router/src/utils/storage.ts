import { LocalStorage } from "@raycast/api";
import { CustomProfileData, SortMode } from "../types";

const CUSTOM_PROFILES_KEY = "custom_browser_profiles";
const FAVORITES_KEY = "favorite_profile_ids";
const PROFILE_NICKNAMES_KEY = "profile_custom_nicknames";

export async function getCustomProfiles(): Promise<CustomProfileData[]> {
  const data = await LocalStorage.getItem<string>(CUSTOM_PROFILES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveCustomProfile(profile: CustomProfileData): Promise<void> {
  const existing = await getCustomProfiles();
  const filtered = existing.filter((p) => p.id !== profile.id);
  filtered.push(profile);
  await LocalStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(filtered));
}

export async function removeCustomProfile(id: string): Promise<void> {
  const existing = await getCustomProfiles();
  const filtered = existing.filter((p) => p.id !== id);
  await LocalStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(filtered));
}

export async function getFavoriteIds(): Promise<string[]> {
  const data = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function toggleFavorite(profileId: string): Promise<boolean> {
  const favorites = await getFavoriteIds();
  const index = favorites.indexOf(profileId);
  let isFav = false;
  if (index >= 0) {
    favorites.splice(index, 1);
    isFav = false;
  } else {
    favorites.push(profileId);
    isFav = true;
  }
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return isFav;
}

export async function getProfileNicknames(): Promise<Record<string, string>> {
  const data = await LocalStorage.getItem<string>(PROFILE_NICKNAMES_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function setProfileNickname(profileId: string, nickname: string): Promise<void> {
  const nicknames = await getProfileNicknames();
  if (!nickname.trim()) {
    delete nicknames[profileId];
  } else {
    nicknames[profileId] = nickname.trim();
  }
  await LocalStorage.setItem(PROFILE_NICKNAMES_KEY, JSON.stringify(nicknames));
}

const SORT_MODE_KEY = "browser_router_sort_mode";
const CUSTOM_ORDER_KEY = "browser_router_custom_profile_order";
const LAUNCH_COUNTS_KEY = "browser_router_launch_counts";

export async function getSortMode(): Promise<SortMode> {
  const data = await LocalStorage.getItem<string>(SORT_MODE_KEY);
  if (data === "reverse-alphabetical" || data === "frequently-used" || data === "custom") {
    return data;
  }
  return "alphabetical";
}

export async function setSortMode(mode: SortMode): Promise<void> {
  await LocalStorage.setItem(SORT_MODE_KEY, mode);
}

export async function getCustomProfileOrder(): Promise<string[]> {
  const data = await LocalStorage.getItem<string>(CUSTOM_ORDER_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function setCustomProfileOrder(order: string[]): Promise<void> {
  await LocalStorage.setItem(CUSTOM_ORDER_KEY, JSON.stringify(order));
}

export async function getProfileLaunchCounts(): Promise<Record<string, number>> {
  const data = await LocalStorage.getItem<string>(LAUNCH_COUNTS_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function recordProfileLaunch(profileId: string): Promise<void> {
  const counts = await getProfileLaunchCounts();
  counts[profileId] = (counts[profileId] || 0) + 1;
  await LocalStorage.setItem(LAUNCH_COUNTS_KEY, JSON.stringify(counts));
}

const LAST_SEEN_VERSION_KEY = "browser_router_last_seen_version";

export async function getLastSeenVersion(): Promise<string | undefined> {
  const data = await LocalStorage.getItem<string>(LAST_SEEN_VERSION_KEY);
  return data || undefined;
}

export async function setLastSeenVersion(version: string): Promise<void> {
  await LocalStorage.setItem(LAST_SEEN_VERSION_KEY, version);
}
