import { Cache } from "@raycast/api";

const storage = new Cache({ namespace: "cursor-icons" });
const PINNED_KEY = "pinned";
const RECENT_KEY = "recent";
const RECENT_LIMIT = 16;

function parseNames(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === "string") : [];
  } catch {
    return [];
  }
}

function setNames(key: string, names: string[]) {
  storage.set(key, JSON.stringify(names));
}

export function getPinnedIconNames(): string[] {
  return parseNames(storage.get(PINNED_KEY));
}

export function getRecentIconNames(): string[] {
  return parseNames(storage.get(RECENT_KEY)).slice(0, RECENT_LIMIT);
}

export function addPinnedIcon(iconName: string) {
  const pinned = getPinnedIconNames();
  setNames(PINNED_KEY, [iconName, ...pinned.filter((name) => name !== iconName)]);
  removeRecentIcon(iconName);
}

export function removePinnedIcon(iconName: string) {
  setNames(
    PINNED_KEY,
    getPinnedIconNames().filter((name) => name !== iconName),
  );
}

export function addRecentIcon(iconName: string) {
  if (getPinnedIconNames().includes(iconName)) {
    return;
  }

  const recent = getRecentIconNames();
  setNames(RECENT_KEY, [iconName, ...recent.filter((name) => name !== iconName)].slice(0, RECENT_LIMIT));
}

export function removeRecentIcon(iconName: string) {
  setNames(
    RECENT_KEY,
    getRecentIconNames().filter((name) => name !== iconName),
  );
}

export function clearRecentIcons() {
  setNames(RECENT_KEY, []);
}
