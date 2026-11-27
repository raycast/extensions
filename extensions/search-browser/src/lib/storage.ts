import fs from "fs";
import path from "path";
import { SEARCH_DATA_DIR } from "./constants";
import {
  BookmarkItem,
  BrowserSettingsSnapshot,
  HistoryEntry,
  PinnedTab,
  RemoteDeviceTabs,
  SearchTab,
  SpaceInfo,
} from "./types";
import { decodeBase64Json, getDomain, normalizeUrlKey, parseSearchTimestamp } from "./utils";

interface RawHistoryEntry {
  key?: string;
  title?: string;
  last?: number;
  count?: number;
  url?: string;
}

interface RawSessionTab {
  url?: string;
  title?: string;
  name?: string;
  home?: string;
  pin?: boolean;
  muted?: boolean;
  touched?: number;
}

interface RawSessionFile {
  active?: number;
  tabs?: RawSessionTab[];
}

interface RawSpace {
  id?: string;
  name?: string;
  colour?: number;
  icon?: string;
}

export interface RawBookmarkNode {
  id?: string;
  title?: string;
  name?: string;
  url?: string;
  children?: RawBookmarkNode[];
  items?: RawBookmarkNode[];
  parent?: string;
}

interface RawPin {
  id?: string;
  title?: string;
  name?: string;
  url?: string;
  home?: string;
  folder?: string;
  parent?: string;
}

export interface RawICloudFile {
  device?: string;
  values?: Record<string, string>;
}

interface RawRemoteDevice {
  at?: number;
  name?: string;
  platform?: string;
  tabs?: Array<{ title?: string; url?: string }>;
}

interface RawPagesIconMap {
  [host: string]: {
    [pathname: string]: {
      dark?: string;
      light?: string;
      seen?: number;
    };
  };
}

const VALID_ICON_HASH = /^[0-9a-f]{32}$/i;

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return null;
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read ${path.basename(filePath)}: ${reason}`);
  }
}

function readJsonFileBestEffort<T>(filePath: string): T | null {
  try {
    return readJsonFile<T>(filePath);
  } catch {
    return null;
  }
}

/**
 * Collect Search's root data directory plus any additional profile directories under `profiles/`.
 */
export function getSearchProfileDirs(baseDir: string = SEARCH_DATA_DIR): Array<{ name: string; dir: string }> {
  const dirs: Array<{ name: string; dir: string }> = [{ name: "Personal", dir: baseDir }];
  const profilesDir = path.join(baseDir, "profiles");
  try {
    if (fs.existsSync(profilesDir) && fs.statSync(profilesDir).isDirectory()) {
      const entries = fs.readdirSync(profilesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          dirs.push({ name: entry.name, dir: path.join(profilesDir, entry.name) });
        }
      }
    }
  } catch {
    // Ignore unreadable profile directories
  }
  return dirs;
}

export function readICloudFile(baseDir: string = SEARCH_DATA_DIR): RawICloudFile | null {
  return readJsonFile<RawICloudFile>(path.join(baseDir, "icloud.json"));
}

/**
 * Read Search Browser's own settings snapshot (e.g. default search engine) from icloud.json.
 */
export function readBrowserSettings(
  baseDir: string = SEARCH_DATA_DIR,
  icloud?: RawICloudFile | null
): BrowserSettingsSnapshot | null {
  const data = icloud === undefined ? readICloudFile(baseDir) : icloud;
  if (!data?.values?.settings) return null;
  const decoded = decodeBase64Json<{ engine?: string; custom?: string; look?: string }>(data.values.settings);
  if (!decoded) return null;
  return {
    engine: decoded.engine,
    customSearchUrl: decoded.custom,
    look: decoded.look,
  };
}

/**
 * Read all configured spaces from spaces.json or icloud.json.
 */
export function readSpaces(baseDir: string = SEARCH_DATA_DIR, icloud?: RawICloudFile | null): SpaceInfo[] {
  const fromFile = readJsonFile<RawSpace[]>(path.join(baseDir, "spaces.json"));
  const cloud = icloud === undefined ? readICloudFile(baseDir) : icloud;
  const fromICloud = cloud?.values?.spaces ? decodeBase64Json<RawSpace[]>(cloud.values.spaces) : null;

  const source = Array.isArray(fromFile) && fromFile.length > 0 ? fromFile : fromICloud;
  if (!Array.isArray(source)) {
    return [{ id: "00000000-0000-0000-0000-000000000001", name: "Personal", colour: 0 }];
  }

  const spaces = source
    .filter((s): s is RawSpace => Boolean(s && typeof s === "object"))
    .map((s, idx) => ({
      id: s.id || `space-${idx}`,
      name: s.name?.trim() || "Personal",
      colour: typeof s.colour === "number" ? s.colour : idx,
      icon: s.icon,
    }));

  return spaces.length > 0 ? spaces : [{ id: "00000000-0000-0000-0000-000000000001", name: "Personal", colour: 0 }];
}

/**
 * Read browsing history from Search Browser's local history.json files.
 */
export function readHistory(baseDir: string = SEARCH_DATA_DIR): HistoryEntry[] {
  const seen = new Map<string, HistoryEntry>();

  for (const { dir } of getSearchProfileDirs(baseDir)) {
    const rawEntries = readJsonFile<RawHistoryEntry[]>(path.join(dir, "history.json"));
    if (!Array.isArray(rawEntries)) continue;

    for (const entry of rawEntries) {
      const url = entry?.url?.trim();
      if (!url || !/^https?:\/\//i.test(url)) continue;

      const lastVisited = parseSearchTimestamp(entry.last);
      const visitCount = typeof entry.count === "number" && entry.count > 0 ? entry.count : 1;
      const title = entry.title?.trim() || getDomain(url);
      const key = entry.key || url;

      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, {
          id: `history:${key}`,
          title,
          url,
          visitCount,
          lastVisited,
        });
      } else {
        const isNewer = lastVisited.getTime() > existing.lastVisited.getTime();
        seen.set(key, {
          id: existing.id,
          title: isNewer && entry.title?.trim() ? title : existing.title,
          url: isNewer ? url : existing.url,
          visitCount: existing.visitCount + visitCount,
          lastVisited: isNewer ? lastVisited : existing.lastVisited,
        });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.lastVisited.getTime() - a.lastVisited.getTime());
}

/**
 * Flatten recursive bookmark nodes into BookmarkItems with folder breadcrumbs.
 */
export function flattenBookmarkNodes(nodes: RawBookmarkNode[], parentPath: string[] = []): BookmarkItem[] {
  const results: BookmarkItem[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node || typeof node !== "object") continue;

    const children = Array.isArray(node.children) ? node.children : Array.isArray(node.items) ? node.items : undefined;
    const nodeTitle = (node.title || node.name || "").trim();

    if (children) {
      const nextPath = nodeTitle ? [...parentPath, nodeTitle] : parentPath;
      results.push(...flattenBookmarkNodes(children, nextPath));
    }

    const url = node.url?.trim();
    if (url && /^https?:\/\//i.test(url)) {
      const folderPath = parentPath.filter(Boolean);
      results.push({
        id: `bookmark:${node.id || `${folderPath.join("/")}:${url}:${i}`}`,
        title: nodeTitle || getDomain(url),
        url,
        folderPath,
        folderLabel: folderPath.length > 0 ? folderPath.join(" / ") : "Bookmarks",
      });
    }
  }

  return results;
}

/**
 * Read bookmarks from bookmarks.json (across profiles) and/or icloud.json fallback.
 */
export function readBookmarks(baseDir: string = SEARCH_DATA_DIR, icloud?: RawICloudFile | null): BookmarkItem[] {
  const all: BookmarkItem[] = [];
  const seenUrls = new Set<string>();

  const addNodes = (nodes: unknown) => {
    if (!Array.isArray(nodes)) return;
    for (const item of flattenBookmarkNodes(nodes as RawBookmarkNode[])) {
      const dedupeKey = `${item.folderLabel}::${normalizeUrlKey(item.url)}`;
      if (!seenUrls.has(dedupeKey)) {
        seenUrls.add(dedupeKey);
        all.push(item);
      }
    }
  };

  for (const { dir } of getSearchProfileDirs(baseDir)) {
    const direct = readJsonFile<unknown>(path.join(dir, "bookmarks.json"));
    if (Array.isArray(direct)) {
      addNodes(direct);
    } else if (direct && typeof direct === "object") {
      const obj = direct as { items?: unknown; children?: unknown; roots?: unknown };
      addNodes(obj.items ?? obj.children ?? obj.roots);
    }
  }

  const cloud = icloud === undefined ? readICloudFile(baseDir) : icloud;
  if (cloud?.values?.bookmarks) {
    const synced = decodeBase64Json<unknown>(cloud.values.bookmarks);
    if (Array.isArray(synced)) {
      addNodes(synced);
    }
  }

  return all;
}

/**
 * Read pinned tabs from pins.json, pin-folders.json, and icloud.json (`values["pins.<spaceId>"]`).
 */
export function readPinnedTabs(
  baseDir: string = SEARCH_DATA_DIR,
  spacesArg?: SpaceInfo[],
  icloud?: RawICloudFile | null
): PinnedTab[] {
  const cloud = icloud === undefined ? readICloudFile(baseDir) : icloud;
  const spaces = spacesArg ?? readSpaces(baseDir, cloud);
  const spaceNameById = new Map(spaces.map((s) => [s.id, s.name]));
  const folderNameById = new Map<string, string>();

  const rawFolders = readJsonFile<unknown>(path.join(baseDir, "pin-folders.json"));
  if (Array.isArray(rawFolders)) {
    for (const f of rawFolders) {
      if (f && typeof f === "object" && "id" in f && "name" in f) {
        const folder = f as { id?: string; name?: string };
        if (folder.id && folder.name) {
          folderNameById.set(folder.id, folder.name);
        }
      }
    }
  }

  const results: PinnedTab[] = [];
  const seen = new Set<string>();

  const collectPins = (pins: unknown, spaceId: string) => {
    if (!Array.isArray(pins)) return;
    const spaceName = spaceNameById.get(spaceId) || (spaceId === "shared" ? "Shared" : "Personal");
    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i] as RawPin;
      if (!pin || typeof pin !== "object") continue;
      const url = (pin.url || pin.home || "").trim();
      if (!url || !/^https?:\/\//i.test(url)) continue;

      const dedupeKey = `${spaceId}::${normalizeUrlKey(url)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const folderId = pin.folder || pin.parent;
      results.push({
        id: `pin:${spaceId}:${pin.id || i}:${url}`,
        title: (pin.title || pin.name || "").trim() || getDomain(url),
        url,
        spaceId,
        spaceName,
        folderName: folderId ? folderNameById.get(folderId) : undefined,
      });
    }
  };

  for (const { dir } of getSearchProfileDirs(baseDir)) {
    const rawPins = readJsonFile<unknown>(path.join(dir, "pins.json"));
    if (Array.isArray(rawPins)) {
      collectPins(rawPins, spaces[0]?.id ?? "default");
    } else if (rawPins && typeof rawPins === "object") {
      for (const [spaceId, list] of Object.entries(rawPins as Record<string, unknown>)) {
        collectPins(list, spaceId);
      }
    }
  }

  if (cloud?.values) {
    for (const [key, encoded] of Object.entries(cloud.values)) {
      if (!key.startsWith("pins.")) continue;
      const spaceId = key.slice("pins.".length);
      const decoded = decodeBase64Json<unknown>(encoded);
      collectPins(decoded, spaceId);
    }
  }

  return results;
}

/**
 * Fallback session reader when Search Browser is not currently running (or AppleScript returns no windows).
 */
export function readSessionTabs(
  baseDir: string = SEARCH_DATA_DIR,
  spacesArg?: SpaceInfo[],
  icloud?: RawICloudFile | null
): SearchTab[] {
  const spaces = spacesArg ?? readSpaces(baseDir, icloud);
  const spaceNameById = new Map(spaces.map((s) => [s.id, s.name]));
  const tabs: SearchTab[] = [];

  const filesToRead: Array<{ filePath: string; spaceName: string }> = [
    { filePath: path.join(baseDir, "session.json"), spaceName: spaces[0]?.name || "Personal" },
  ];

  try {
    if (fs.existsSync(baseDir)) {
      for (const name of fs.readdirSync(baseDir)) {
        const match = /^session-([0-9A-Fa-f-]+)\.json$/.exec(name);
        if (match) {
          const spaceId = match[1];
          filesToRead.push({
            filePath: path.join(baseDir, name),
            spaceName: spaceNameById.get(spaceId) || "Space",
          });
        }
      }
    }
  } catch {
    // Ignore directory read errors
  }

  const seenUrls = new Set<string>();
  let windowCounter = 0;

  for (const { filePath, spaceName } of filesToRead) {
    const session = readJsonFile<RawSessionFile>(filePath);
    if (!session?.tabs || !Array.isArray(session.tabs)) continue;
    windowCounter += 1;
    const activeIndex = typeof session.active === "number" ? session.active : -1;

    session.tabs.forEach((t, idx) => {
      const url = (t.url || t.home || "").trim();
      if (!url || !/^https?:\/\//i.test(url)) return;
      const dedupeKey = `${spaceName}::${url}`;
      if (seenUrls.has(dedupeKey)) return;
      seenUrls.add(dedupeKey);

      tabs.push({
        id: `session:${windowCounter}:${idx}:${url}`,
        title: (t.title || t.name || "").trim() || getDomain(url),
        url,
        windowId: windowCounter,
        tabIndex: idx + 1,
        space: spaceName,
        profile: "Personal",
        isActive: idx === activeIndex,
        isPinned: Boolean(t.pin),
        touchedAt: typeof t.touched === "number" ? t.touched : undefined,
        source: "session",
      });
    });
  }

  return tabs.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return (b.touchedAt ?? 0) - (a.touchedAt ?? 0);
  });
}

/**
 * Read iCloud tabs synced from OTHER devices (excluding this local Mac's own device ID).
 */
export function readRemoteDeviceTabs(
  baseDir: string = SEARCH_DATA_DIR,
  icloud?: RawICloudFile | null
): RemoteDeviceTabs[] {
  const cloud = icloud === undefined ? readICloudFile(baseDir) : icloud;
  if (!cloud?.values) return [];

  const localDeviceId = cloud.device;
  const devices: RemoteDeviceTabs[] = [];

  for (const [key, encoded] of Object.entries(cloud.values)) {
    if (!key.startsWith("device.")) continue;
    const deviceId = key.slice("device.".length);
    if (localDeviceId && deviceId === localDeviceId) continue;

    const decoded = decodeBase64Json<RawRemoteDevice>(encoded);
    if (!decoded || !Array.isArray(decoded.tabs) || decoded.tabs.length === 0) continue;

    const deviceName = decoded.name?.trim() || "iCloud Device";
    const platform = decoded.platform?.trim() || "icloud";
    const tabs = decoded.tabs
      .filter((t) => Boolean(t?.url && /^https?:\/\//i.test(t.url)))
      .map((t, idx) => ({
        id: `remote:${deviceId}:${idx}:${t.url}`,
        title: t.title?.trim() || getDomain(t.url!),
        url: t.url!,
        deviceName,
        platform,
      }));

    if (tabs.length > 0) {
      devices.push({
        deviceId,
        deviceName,
        platform,
        updatedAt: typeof decoded.at === "number" ? parseSearchTimestamp(decoded.at) : null,
        tabs,
      });
    }
  }

  return devices.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
}

/**
 * Lightweight local snapshot for Search Tabs (skips reading history.json and bookmarks.json).
 */
export function readTabsLocalSnapshot(baseDir: string = SEARCH_DATA_DIR) {
  const errors: string[] = [];
  let icloud: RawICloudFile | null = null;
  try {
    icloud = readICloudFile(baseDir);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  let spaces: SpaceInfo[] = [{ id: "00000000-0000-0000-0000-000000000001", name: "Personal", colour: 0 }];
  try {
    spaces = readSpaces(baseDir, icloud);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const settings = readBrowserSettings(baseDir, icloud);

  let pins: PinnedTab[] = [];
  try {
    pins = readPinnedTabs(baseDir, spaces, icloud);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const remoteDevices = readRemoteDeviceTabs(baseDir, icloud);
  const error = errors.length > 0 ? new Error(errors.join(" · ")) : null;

  return { spaces, settings, pins, remoteDevices, error };
}

/**
 * Read spaces, pins, bookmarks, history, remote tabs, and settings while parsing `icloud.json` only once.
 */
export function readLocalBrowserSnapshot(baseDir: string = SEARCH_DATA_DIR) {
  const errors: string[] = [];
  let icloud: RawICloudFile | null = null;
  try {
    icloud = readICloudFile(baseDir);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  let spaces: SpaceInfo[] = [{ id: "00000000-0000-0000-0000-000000000001", name: "Personal", colour: 0 }];
  try {
    spaces = readSpaces(baseDir, icloud);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const settings = readBrowserSettings(baseDir, icloud);

  let pins: PinnedTab[] = [];
  try {
    pins = readPinnedTabs(baseDir, spaces, icloud);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const remoteDevices = readRemoteDeviceTabs(baseDir, icloud);

  let bookmarks: BookmarkItem[] = [];
  try {
    bookmarks = readBookmarks(baseDir, icloud);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  let history: HistoryEntry[] = [];
  try {
    history = readHistory(baseDir);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const error = errors.length > 0 ? new Error(errors.join(" · ")) : null;

  return { spaces, settings, pins, remoteDevices, bookmarks, history, error };
}

// --- Local Search Browser Favicon Cache ---

interface CachedIconState {
  loadedAt: number;
  data: RawPagesIconMap;
  resolved: Map<string, string | null>;
}

const cachedIconIndexes = new Map<string, CachedIconState>();
const ICON_CACHE_TTL_MS = 15_000;

function loadPagesIconState(baseDir: string = SEARCH_DATA_DIR): CachedIconState {
  const now = Date.now();
  const cached = cachedIconIndexes.get(baseDir);
  if (cached && now - cached.loadedAt < ICON_CACHE_TTL_MS) {
    return cached;
  }
  const parsed = readJsonFileBestEffort<RawPagesIconMap>(path.join(baseDir, "icons", "pages.json")) ?? {};
  const state: CachedIconState = { loadedAt: now, data: parsed, resolved: new Map() };
  cachedIconIndexes.set(baseDir, state);
  return state;
}

/**
 * Look up a locally cached Search Browser favicon file path for a URL, respecting light/dark appearance.
 */
export function resolveLocalFaviconPath(
  url: string,
  appearance: "light" | "dark" = "dark",
  baseDir: string = SEARCH_DATA_DIR
): string | null {
  try {
    const parsed = new URL(url);
    const state = loadPagesIconState(baseDir);
    const cacheKey = `${appearance}:${parsed.hostname}:${parsed.pathname}`;
    if (state.resolved.has(cacheKey)) {
      return state.resolved.get(cacheKey) ?? null;
    }

    const host = parsed.hostname;
    const hostWithoutWww = host.replace(/^www\./i, "");
    const hostWithWww = host.startsWith("www.") ? host : `www.${host}`;
    const hostEntry = state.data[host] ?? state.data[hostWithoutWww] ?? state.data[hostWithWww];

    if (!hostEntry) {
      state.resolved.set(cacheKey, null);
      return null;
    }

    const pageEntry = hostEntry[parsed.pathname] ?? hostEntry["/"] ?? Object.values(hostEntry)[0];
    if (!pageEntry) {
      state.resolved.set(cacheKey, null);
      return null;
    }

    const preferredHash = appearance === "dark" ? pageEntry.dark || pageEntry.light : pageEntry.light || pageEntry.dark;
    if (!preferredHash || !VALID_ICON_HASH.test(preferredHash)) {
      state.resolved.set(cacheKey, null);
      return null;
    }

    const iconsDir = path.join(baseDir, "icons");
    const pngPath = path.join(iconsDir, `${preferredHash}.png`);
    if (fs.existsSync(pngPath)) {
      state.resolved.set(cacheKey, pngPath);
      return pngPath;
    }

    const svgPath = path.join(iconsDir, `${preferredHash}.svg`);
    if (fs.existsSync(svgPath)) {
      state.resolved.set(cacheKey, svgPath);
      return svgPath;
    }

    state.resolved.set(cacheKey, null);
    return null;
  } catch {
    return null;
  }
}
