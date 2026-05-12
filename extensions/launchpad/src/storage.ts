import { Application, getApplications, LocalStorage } from "@raycast/api";
import { AppEntry, LaunchpadConfig, Folder } from "./types";
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import { resolveLocalizedNames } from "./localizedNames";

const STORAGE_KEY = "launchpad_config";

// ── Launchpad DB import ────────────────────────────────────────────────────

// The DB lives in a per-user temp dir, not ~/Library/Application Support/Dock
function findLaunchpadDb(): string | null {
  try {
    const darwinUserDir = execFileSync("getconf", ["DARWIN_USER_DIR"], { encoding: "utf8" }).trim();
    const dbPath = join("/private" + darwinUserDir, "com.apple.dock.launchpad", "db", "db");
    return existsSync(dbPath) ? dbPath : null;
  } catch {
    return null;
  }
}

interface RawDbRow {
  groupTitle: string | null;
  appTitle: string;
  bundleId: string;
}

function queryLaunchpadDb(dbPath: string): RawDbRow[] {
  // Real Launchpad schema (macOS 15+):
  //   items:  rowid, uuid, flags, type, parent_id, ordering
  //     type 2 = folder, type 3 = page-inside-folder, type 4 = app
  //   apps:   item_id, title, bundleid, ...
  //   groups: item_id, category_id, title   (folders; no items_within_groups table)
  //
  // Hierarchy: app item → page item (type 3) → folder item (type 2)
  // We join two levels up to reach the folder's title.
  const sql = [
    "SELECT g.title AS groupTitle, a.title AS appTitle, a.bundleid AS bundleId",
    "FROM apps a",
    "JOIN items app_item ON app_item.rowid = a.item_id",
    "JOIN items page_item ON page_item.rowid = app_item.parent_id",
    "LEFT JOIN groups g ON g.item_id = page_item.parent_id",
    "WHERE a.bundleid IS NOT NULL AND a.bundleid != ''",
    "  AND page_item.type = 3",
    "ORDER BY g.title, page_item.ordering, app_item.ordering;",
  ].join(" ");

  try {
    const raw = execFileSync("sqlite3", ["-separator", "|||", dbPath, sql], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [groupTitle, appTitle, bundleId] = line.split("|||");
        return {
          groupTitle: groupTitle && groupTitle !== "null" ? groupTitle : null,
          appTitle,
          bundleId,
        };
      });
  } catch {
    return [];
  }
}

// Launchpad internal group titles that are not user-created folders
const SYSTEM_GROUPS = new Set(["Root", "HoldingPage", "Default", ""]);

function importFromLaunchpadDb(
  installedApps: Application[],
  localizedNames: Map<string, string>
): Pick<LaunchpadConfig, "folders" | "uncategorized"> {
  const byBundleId = new Map(installedApps.map((a) => [a.bundleId, a]));

  const dbPath = findLaunchpadDb();
  if (!dbPath) return { folders: [], uncategorized: toEntries(installedApps, localizedNames) };

  const rows = queryLaunchpadDb(dbPath);
  if (rows.length === 0) return { folders: [], uncategorized: toEntries(installedApps, localizedNames) };

  const folderMap = new Map<string, AppEntry[]>();
  const placedBundleIds = new Set<string>();

  for (const row of rows) {
    const app = byBundleId.get(row.bundleId);
    if (!app) continue;
    const entry: AppEntry = {
      bundleId: app.bundleId!,
      name: localizedNames.get(app.path) ?? app.name,
      path: app.path,
    };
    placedBundleIds.add(app.bundleId!);

    const groupTitle = row.groupTitle && !SYSTEM_GROUPS.has(row.groupTitle) ? row.groupTitle : null;
    if (groupTitle) {
      if (!folderMap.has(groupTitle)) folderMap.set(groupTitle, []);
      folderMap.get(groupTitle)!.push(entry);
    }
  }

  const folders: Folder[] = Array.from(folderMap.entries()).map(([name, apps]) => ({
    id: crypto.randomUUID(),
    name,
    apps,
  }));

  const uncategorized = installedApps
    .filter((a) => a.bundleId && !placedBundleIds.has(a.bundleId))
    .map((a) => ({
      bundleId: a.bundleId!,
      name: localizedNames.get(a.path) ?? a.name,
      path: a.path,
    }));

  return { folders, uncategorized };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toEntries(apps: Application[], localizedNames: Map<string, string>): AppEntry[] {
  return apps
    .filter((a) => a.bundleId)
    .map((a) => ({
      bundleId: a.bundleId!,
      name: localizedNames.get(a.path) ?? a.name,
      path: a.path,
    }));
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function loadCachedConfig(): Promise<LaunchpadConfig | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LaunchpadConfig;
  } catch {
    return null;
  }
}

export async function firstRunLoadConfig(): Promise<LaunchpadConfig> {
  const installedApps = await getApplications();
  const localizedNames = resolveLocalizedNames(installedApps.map((a) => a.path));
  const { folders, uncategorized } = importFromLaunchpadDb(installedApps, localizedNames);
  const config: LaunchpadConfig = { folders, uncategorized, hidden: [] };
  await saveConfig(config);
  return config;
}

export async function syncWithSystem(config: LaunchpadConfig): Promise<LaunchpadConfig> {
  return syncNewApps(config);
}

export async function saveConfig(config: LaunchpadConfig): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// Detect newly installed or removed apps, keeping folder structure intact.
async function syncNewApps(config: LaunchpadConfig): Promise<LaunchpadConfig> {
  const installedApps = await getApplications();
  const localizedNames = resolveLocalizedNames(installedApps.map((a) => a.path));

  const installedIds = new Set(installedApps.filter((a) => a.bundleId).map((a) => a.bundleId!));
  const metaByBundleId = new Map(installedApps.map((a) => [a.bundleId!, a]));

  const knownIds = new Set<string>([
    ...config.uncategorized.map((a) => a.bundleId),
    ...config.hidden.map((a) => a.bundleId),
    ...config.folders.flatMap((f) => f.apps.map((a) => a.bundleId)),
  ]);

  // Refresh localized name and path from system (both can change after updates)
  function updateMeta(entries: AppEntry[]): AppEntry[] {
    return entries.map((e) => {
      const sys = metaByBundleId.get(e.bundleId);
      if (!sys) return e;
      return {
        ...e,
        name: localizedNames.get(sys.path) ?? sys.name,
        path: sys.path,
      };
    });
  }

  // Only remove an app if getApplications() explicitly returned apps AND this one
  // is not among them. Hidden bundleIds are never removed — the app may just be
  // a system app that getApplications() omits.
  function filterInstalled(entries: AppEntry[]): AppEntry[] {
    if (installedIds.size === 0) return entries; // safety: don't wipe if scan failed
    return entries.filter((e) => installedIds.has(e.bundleId));
  }

  const newApps: AppEntry[] = installedApps
    .filter((a) => a.bundleId && !knownIds.has(a.bundleId))
    .map((a) => ({
      bundleId: a.bundleId!,
      name: localizedNames.get(a.path) ?? a.name,
      path: a.path,
    }));

  const updated: LaunchpadConfig = {
    folders: config.folders.map((f) => ({
      ...f,
      apps: updateMeta(filterInstalled(f.apps)),
    })),
    // Newly-installed apps land at the START of uncategorized so the user
    // sees them immediately on the next open.
    uncategorized: [...newApps, ...updateMeta(filterInstalled(config.uncategorized))],
    // Never remove hidden entries — the user hid them intentionally.
    // Refresh name/path if the system has updated info for them.
    hidden: updateMeta(config.hidden),
  };

  await saveConfig(updated);
  return updated;
}
