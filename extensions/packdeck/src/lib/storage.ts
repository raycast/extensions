import { LocalStorage } from "@raycast/api";
import { FavoritePackage, HistoryEntry, PackageManagerName, ProjectHealthSnapshot } from "../types";

const KEYS = {
  ACTIVE_PROJECT: "packdeck:activeProject",
  CUSTOM_PROJECTS: "packdeck:customProjects",
  PINNED_PROJECTS: "packdeck:pinnedProjects",
  FAVORITES: "packdeck:favorites",
  LEGACY_FAVOURITES: "packdeck:favourites",
  HISTORY: "packdeck:history",
  RECENT_SEARCHES: "packdeck:recentSearches",
  RECENT_SCRIPTS: "packdeck:recentScripts",
  HEALTH_SNAPSHOTS: "packdeck:healthSnapshots",
} as const;

const MAX_HISTORY_ENTRIES = 100;
const MAX_RECENT_SEARCHES = 15;
const MAX_RECENT_SCRIPTS = 25;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

// Active project
export async function getActiveProjectPath(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.ACTIVE_PROJECT);
}

export async function setActiveProjectPath(projectPath: string): Promise<void> {
  await LocalStorage.setItem(KEYS.ACTIVE_PROJECT, projectPath);
}

// Custom project paths
export async function getCustomProjectPaths(): Promise<string[]> {
  return readJson<string[]>(KEYS.CUSTOM_PROJECTS, []);
}

export async function addCustomProjectPath(projectPath: string): Promise<string[]> {
  const existing = await getCustomProjectPaths();
  if (existing.includes(projectPath)) return existing;
  const updated = [projectPath, ...existing];
  await writeJson(KEYS.CUSTOM_PROJECTS, updated);
  return updated;
}

export async function removeCustomProjectPath(projectPath: string): Promise<string[]> {
  const existing = await getCustomProjectPaths();
  const updated = existing.filter((p) => p !== projectPath);
  await writeJson(KEYS.CUSTOM_PROJECTS, updated);
  return updated;
}

// Pinned projects
export async function getPinnedProjectPaths(): Promise<string[]> {
  return readJson<string[]>(KEYS.PINNED_PROJECTS, []);
}

export async function togglePinnedProject(projectPath: string): Promise<{ pinned: boolean; list: string[] }> {
  const existing = await getPinnedProjectPaths();
  const isPinned = existing.includes(projectPath);
  const updated = isPinned ? existing.filter((p) => p !== projectPath) : [projectPath, ...existing];
  await writeJson(KEYS.PINNED_PROJECTS, updated);
  return { pinned: !isPinned, list: updated };
}

// Favorites (migrates legacy key seamlessly if present)
export async function getFavorites(): Promise<FavoritePackage[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.FAVORITES);
  if (raw) {
    try {
      return JSON.parse(raw) as FavoritePackage[];
    } catch {
      return [];
    }
  }
  const legacy = await readJson<FavoritePackage[]>(KEYS.LEGACY_FAVOURITES, []);
  if (legacy.length > 0) {
    await writeJson(KEYS.FAVORITES, legacy);
    await LocalStorage.removeItem(KEYS.LEGACY_FAVOURITES);
  }
  return legacy;
}

export async function addFavorite(pkg: Omit<FavoritePackage, "addedAt">): Promise<FavoritePackage[]> {
  const existing = await getFavorites();
  const filtered = existing.filter((item) => item.name !== pkg.name);
  const updated: FavoritePackage[] = [{ ...pkg, addedAt: Date.now() }, ...filtered];
  await writeJson(KEYS.FAVORITES, updated);
  return updated;
}

export async function removeFavorite(packageName: string): Promise<FavoritePackage[]> {
  const existing = await getFavorites();
  const updated = existing.filter((item) => item.name !== packageName);
  await writeJson(KEYS.FAVORITES, updated);
  return updated;
}

export async function toggleFavorite(
  pkg: Omit<FavoritePackage, "addedAt">,
): Promise<{ isFavorite: boolean; favorites: FavoritePackage[] }> {
  const existing = await getFavorites();
  if (existing.some((item) => item.name === pkg.name)) {
    const favorites = await removeFavorite(pkg.name);
    return { isFavorite: false, favorites };
  }
  const favorites = await addFavorite(pkg);
  return { isFavorite: true, favorites };
}

// Command History
export async function getHistory(): Promise<HistoryEntry[]> {
  return readJson<HistoryEntry[]>(KEYS.HISTORY, []);
}

export async function recordHistory(entry: Omit<HistoryEntry, "id" | "timestamp">): Promise<HistoryEntry> {
  const fullEntry: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  const existing = await getHistory();
  const updated = [fullEntry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
  await writeJson(KEYS.HISTORY, updated);
  return fullEntry;
}

export async function removeHistoryEntry(id: string): Promise<HistoryEntry[]> {
  const existing = await getHistory();
  const updated = existing.filter((item) => item.id !== id);
  await writeJson(KEYS.HISTORY, updated);
  return updated;
}

export async function clearHistory(): Promise<void> {
  await writeJson(KEYS.HISTORY, []);
}

// Recent searches
export async function getRecentSearches(): Promise<string[]> {
  return readJson<string[]>(KEYS.RECENT_SEARCHES, []);
}

export async function recordRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return getRecentSearches();
  const existing = await getRecentSearches();
  const updated = [trimmed, ...existing.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
  await writeJson(KEYS.RECENT_SEARCHES, updated);
  return updated;
}

export async function clearRecentSearches(): Promise<void> {
  await writeJson(KEYS.RECENT_SEARCHES, []);
}

// Recent scripts
export interface RecentScriptRecord {
  projectPath: string;
  scriptName: string;
  packageManager: PackageManagerName;
  ranAt: number;
}

export async function getRecentScripts(): Promise<RecentScriptRecord[]> {
  return readJson<RecentScriptRecord[]>(KEYS.RECENT_SCRIPTS, []);
}

export async function recordRecentScript(
  projectPath: string,
  scriptName: string,
  packageManager: PackageManagerName,
): Promise<void> {
  const existing = await getRecentScripts();
  const filtered = existing.filter((r) => !(r.projectPath === projectPath && r.scriptName === scriptName));
  const updated: RecentScriptRecord[] = [
    { projectPath, scriptName, packageManager, ranAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_SCRIPTS);
  await writeJson(KEYS.RECENT_SCRIPTS, updated);
}

// Health snapshots for smart notification deduplication
export async function getLastHealthSnapshots(): Promise<Record<string, ProjectHealthSnapshot>> {
  return readJson<Record<string, ProjectHealthSnapshot>>(KEYS.HEALTH_SNAPSHOTS, {});
}

export async function saveHealthSnapshots(snapshots: Record<string, ProjectHealthSnapshot>): Promise<void> {
  await writeJson(KEYS.HEALTH_SNAPSHOTS, snapshots);
}
