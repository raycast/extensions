/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  environment,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import {
  getDefaultSteamPath,
  getAppStats,
  getLibraryFolders,
  getInstalledApps,
} from "./steam";
import { getLocalAppMetadata, AppInfoMetadata } from "./appinfo";
import { GameCache } from "../types";

const JUNK_REGEX =
  /\b(soundtrack|ost|sdk|server|playtest|public test|test server|experimental)\b/i;
const SUFFIX_REGEX = /(?: - beta| beta| prototype| multiplayer)$/i;

const CACHE_FILE = path.join(environment.supportPath, "game_cache.json");

let globalStore: Map<number, GameCache> | null = null;
let storeHydrationPromise: Promise<Map<number, GameCache>> | null = null;

async function safeRename(tmpPath: string, target: string): Promise<void> {
  try {
    await fs.rename(tmpPath, target);
  } catch (e: any) {
    if (e.code === "EPERM" || e.code === "EXDEV") {
      await fs.copyFile(tmpPath, target);
      await fs.unlink(tmpPath);
    } else {
      throw e;
    }
  }
}

async function saveCache(cache: Map<number, GameCache>) {
  await fs.mkdir(environment.supportPath, { recursive: true });
  const tmpPath = `${CACHE_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  await fs.writeFile(
    tmpPath,
    JSON.stringify(Array.from(cache.values()), null, 2),
  );
  await safeRename(tmpPath, CACHE_FILE);
}

async function getOrHydrateStore(): Promise<Map<number, GameCache>> {
  if (globalStore) return globalStore;
  if (!storeHydrationPromise) {
    storeHydrationPromise = (async () => {
      try {
        const data = await fs.readFile(CACHE_FILE, "utf-8").catch(() => "[]");
        let parsed: any[] = [];
        try {
          const raw = JSON.parse(data);
          if (Array.isArray(raw)) parsed = raw;
        } catch (error) {
          /* ignore */
        }
        globalStore = new Map(parsed.map((g) => [g.appId, g]));
      } catch {
        globalStore = new Map();
      }
      return globalStore;
    })();
  }
  await storeHydrationPromise;
  return globalStore!;
}

export async function syncSteamData(
  onProgress?: (data: GameCache[]) => void,
): Promise<GameCache[]> {
  const prefs = getPreferenceValues<Preferences>();
  const steamPath = prefs.customSteamPath || (await getDefaultSteamPath());

  if (!steamPath)
    throw new Error("Steam installation not found. Please check preferences.");

  try {
    await fs.access(steamPath);
  } catch {
    throw new Error("Steam installation not found. Please check preferences.");
  }

  const store = await getOrHydrateStore();

  const [localStats, libraryFolders, metadataPayload] = await Promise.all([
    getAppStats(steamPath),
    getLibraryFolders(steamPath),
    getLocalAppMetadata(steamPath).catch(() => ({
      apps: new Map<number, AppInfoMetadata>(),
      rejected: new Set<number>(),
      schemaWarning: false,
    })),
  ]);

  if (metadataPayload.schemaWarning) {
    showToast({
      style: Toast.Style.Failure,
      title: "VDF Schema Warning",
      message:
        "Steam's local data format may have changed. Metadata might be incomplete.",
    });
  }

  const localMetadata = metadataPayload.apps;
  const rejectedAppIds = metadataPayload.rejected;

  const installedApps = await getInstalledApps(libraryFolders);
  const installedAppsMap = new Map<number, string>(
    installedApps.map((a) => [a.appId, a.name]),
  );

  const allAppIds = new Set<number>();
  for (const id of localStats.keys()) allAppIds.add(id);
  for (const app of installedApps) allAppIds.add(app.appId);
  for (const id of store.keys()) allAppIds.add(id);

  for (const id of localMetadata.keys()) allAppIds.add(id);

  let isDirty = false;

  for (const appId of allAppIds) {
    const stats = localStats.get(appId);
    const manifestName = installedAppsMap.get(appId);

    if (rejectedAppIds.has(appId)) {
      if (!manifestName) {
        if (store.has(appId)) {
          store.delete(appId);
          isDirty = true;
        }
        continue;
      }
    }

    const metadata = localMetadata.get(appId);
    const existing = store.get(appId);

    const finalName =
      metadata?.name || manifestName || existing?.name || `App ${appId}`;

    if (/^App\s+\d+$/.test(finalName)) {
      if (store.has(appId)) {
        const item = store.get(appId)!;
        item.enrichmentFailed = true;
        store.set(appId, item);
        isDirty = true;
      }
      continue;
    }

    if (JUNK_REGEX.test(finalName) || SUFFIX_REGEX.test(finalName)) {
      if (store.has(appId)) {
        const item = store.get(appId)!;
        item.enrichmentFailed = true;
        store.set(appId, item);
        isDirty = true;
      }
      continue;
    }

    const playtime = stats?.playtime || existing?.playtime || 0;
    const lastPlayedAt = stats?.lastPlayedAt || existing?.lastPlayedAt || null;

    const genres =
      metadata?.genres && metadata.genres.length > 0
        ? metadata.genres
        : existing?.genres;
    const tags =
      metadata?.tags && metadata.tags.length > 0
        ? metadata.tags
        : existing?.tags;
    const categories =
      metadata?.categories && metadata.categories.length > 0
        ? metadata.categories
        : existing?.categories;
    const developer = metadata?.developer || existing?.developer || "";

    const isInstalled = Boolean(manifestName);
    const releaseDate = metadata?.releaseDate || existing?.releaseDate || 0;
    store.set(appId, {
      developer,
      appId,
      name: finalName,
      playtime,
      lastPlayedAt,
      launchCount: 0,
      genres,
      tags,
      categories,
      resolutionState: "resolved",
      isInstalled,
      releaseDate,
    });

    isDirty = true;
  }

  if (isDirty) await saveCache(store);

  const finalData = Array.from(store.values());
  if (onProgress) onProgress(finalData);

  return finalData;
}

export async function forceRebuildCache() {
  try {
    await fs.unlink(CACHE_FILE);
  } catch (e) {
    /* ignore */
  }
  globalStore = null;
  storeHydrationPromise = null;
}
