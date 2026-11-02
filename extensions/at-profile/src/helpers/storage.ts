import { AsyncLocalStorage } from "node:async_hooks";
import { join } from "node:path";
import { environment, LocalStorage } from "@raycast/api";
import { App, AppSetting, UsageHistoryItem } from "../types";
import { defaultApps } from "../utils/default-apps";
import { withFileLock } from "./file-lock";
import { cleanProfile, generateAppValue } from "./url";

export const STORAGE_KEYS = {
  USAGE_HISTORY: "usageHistory",
  STARRED_HISTORY_ITEMS: "starredHistoryItems",
  APP_SETTINGS: "appSettings",
  CUSTOM_APPS: "customApps",
  SCHEMA_VERSION: "schemaVersion",
  MIGRATION_PLAN: "migrationPlan",
  // Old app ID → new, for every rename a migration made. Views remembering an old ID look it up here.
  APP_ID_ALIASES: "appIdAliases",
  // Written by useLocalStorage in the views, outside the lock. Migrations leave them alone so they can't overwrite
  // a newer choice; the views follow APP_ID_ALIASES instead.
  LAST_SELECTED_APP: "lastSelectedApp",
  HISTORY_APP_FILTER: "history-app-filter",
  HISTORY_SEARCH_TEXT: "history-search-text",
} as const;

type DataKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const SCHEMA_VERSION = 2;

const PAIR_SEPARATOR = "::";

/**
 * One key per profile + app, ignoring case and a leading @, so "@Alice" and "alice" on X are the same entry
 */
export function getHistoryPairKey(profile: string, app: string): string {
  return `${app.trim().toLowerCase()}${PAIR_SEPARATOR}${cleanProfile(profile).toLowerCase()}`;
}

function splitPair(pair: string): { app: string; profile: string } | undefined {
  const separator = pair.indexOf(PAIR_SEPARATOR);
  return separator === -1
    ? undefined
    : { app: pair.slice(0, separator), profile: pair.slice(separator + PAIR_SEPARATOR.length) };
}

type Listener = () => void;
const listeners = new Map<DataKey, Set<Listener>>();

/**
 * Call `listener` after any write to one of `keys`. Views pushed on top of each other run in one process, so a
 * write in Manage Apps reaches an Open Profile form underneath it.
 * @returns unsubscribe
 */
export function subscribeToStorage(keys: DataKey[], listener: Listener): () => void {
  for (const key of keys) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)?.add(listener);
  }
  return () => keys.forEach((key) => listeners.get(key)?.delete(listener));
}

function notify(key: DataKey) {
  listeners.get(key)?.forEach((listener) => listener());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApp(value: unknown): value is App {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.value === "string" &&
    typeof value.urlTemplate === "string"
  );
}

function isAppSetting(value: unknown): value is AppSetting {
  return isRecord(value) && typeof value.value === "string" && typeof value.visible === "boolean";
}

/**
 * A stored or imported open count. History written before open counts existed records one visit.
 */
export function toOpenCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

/**
 * A usable open time: YAML can hold `.inf` or `.nan`, which JSON would later store as null
 */
export function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function toHistoryItem(value: unknown): UsageHistoryItem | undefined {
  if (
    !isRecord(value) ||
    typeof value.profile !== "string" ||
    typeof value.app !== "string" ||
    !isValidTimestamp(value.timestamp)
  ) {
    return undefined;
  }
  return {
    profile: value.profile,
    app: value.app,
    appName: typeof value.appName === "string" ? value.appName : value.app,
    timestamp: value.timestamp,
    count: toOpenCount(value.count),
  };
}

async function readJson(key: DataKey): Promise<unknown> {
  const raw = await LocalStorage.getItem<string>(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(String(raw));
  } catch (error) {
    console.error(`Ignoring unreadable LocalStorage value "${key}":`, error);
    return undefined;
  }
}

async function readList<T>(key: DataKey, toItem: (value: unknown) => T | undefined): Promise<T[]> {
  const parsed = await readJson(key);
  if (parsed === undefined) return [];
  if (!Array.isArray(parsed)) {
    console.error(`Ignoring LocalStorage value "${key}": expected a list`);
    return [];
  }
  return parsed.map(toItem).filter((item): item is T => item !== undefined);
}

async function putJson(key: DataKey, value: unknown) {
  // One writer outside the lock would undo the lock for every other writer
  if (!lockHeld.getStore()) throw new Error(`Write to "${key}" outside withStorageLock`);
  await LocalStorage.setItem(key, JSON.stringify(value));
}

async function writeJson(key: DataKey, value: unknown) {
  await putJson(key, value);
  notify(key);
}

const readCustomApps = () =>
  readList(STORAGE_KEYS.CUSTOM_APPS, (value) =>
    isApp(value) ? { ...value, placeholder: value.placeholder ?? "username" } : undefined,
  );
const readAppSettings = () => readList(STORAGE_KEYS.APP_SETTINGS, (value) => (isAppSetting(value) ? value : undefined));
/**
 * The old writer matched profiles case-sensitively, so stored History can hold "Alice" and "alice" on one app.
 * Read them as one entry: the newest row's details, with the opens added up.
 */
async function readUsageHistory(): Promise<UsageHistoryItem[]> {
  const merged = new Map<string, UsageHistoryItem>();
  for (const item of await readList(STORAGE_KEYS.USAGE_HISTORY, toHistoryItem)) {
    const key = getHistoryPairKey(item.profile, item.app);
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, item);
    } else {
      const newest = item.timestamp > previous.timestamp ? item : previous;
      merged.set(key, { ...newest, count: previous.count + item.count });
    }
  }
  return Array.from(merged.values());
}

/**
 * Starred keys written by the old code could keep extra @ signs; read them in the current key format
 */
async function readStarredPairs(): Promise<string[]> {
  const pairs = await readList(STORAGE_KEYS.STARRED_HISTORY_ITEMS, (value) =>
    typeof value === "string" ? value : undefined,
  );
  return [
    ...new Set(
      pairs.map((pair) => {
        const parts = splitPair(pair);
        return parts ? getHistoryPairKey(parts.profile, parts.app) : pair;
      }),
    ),
  ];
}

/**
 * IDs that History, stars or visibility settings still point at, so a new app never inherits a deleted app's
 * visits
 */
async function readReferencedAppIds(): Promise<Set<string>> {
  const [history, starred, settings] = await Promise.all([readUsageHistory(), readStarredPairs(), readAppSettings()]);
  return new Set([
    ...history.map((item) => item.app),
    ...starred.map((pair) => splitPair(pair)?.app ?? ""),
    ...settings.map((setting) => setting.value),
  ]);
}

/**
 * Schema 1 → 2: custom app IDs. The old generator kept `test`, its stand-in for {profile}, whenever the
 * placeholder was not a whole path segment, so `https://www.producthunt.com/@{profile}` became
 * `producthunt-com-test`. Rename each such app to the ID the fixed generator gives, and carry every reference
 * along. An app keeps its ID if the new one is already taken.
 */
async function planCustomAppRenames(customApps: App[]): Promise<Map<string, string>> {
  const taken = new Set([...defaultApps.map((app) => app.value), ...customApps.map((app) => app.value)]);
  (await readReferencedAppIds()).forEach((value) => taken.add(value));
  const renames = new Map<string, string>();
  for (const app of customApps) {
    const next = generateAppValue(app.urlTemplate);
    if (next && next !== app.value && !taken.has(next)) {
      renames.set(app.value, next);
      taken.add(next);
    }
  }
  return renames;
}

async function migrateCustomAppIds() {
  const customApps = await readCustomApps();

  // The plan is saved before anything is rewritten. If a write fails, the retry resumes the saved plan rather
  // than re-planning against half-rewritten references. Every rewrite below is safe to repeat.
  const saved = await readJson(STORAGE_KEYS.MIGRATION_PLAN);
  const renames = isRecord(saved)
    ? new Map(Object.entries(saved).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : await planCustomAppRenames(customApps);
  if (renames.size === 0) return;
  await putJson(STORAGE_KEYS.MIGRATION_PLAN, Object.fromEntries(renames));

  const rename = (value: string) => renames.get(value) ?? value;
  await putJson(
    STORAGE_KEYS.APP_SETTINGS,
    (await readAppSettings()).map((setting) => ({ ...setting, value: rename(setting.value) })),
  );
  await putJson(
    STORAGE_KEYS.USAGE_HISTORY,
    (await readUsageHistory()).map((item) => ({ ...item, app: rename(item.app) })),
  );
  await putJson(
    STORAGE_KEYS.STARRED_HISTORY_ITEMS,
    (await readStarredPairs()).map((pair) => {
      const parts = splitPair(pair);
      return parts ? getHistoryPairKey(parts.profile, rename(parts.app)) : pair;
    }),
  );
  await putJson(
    STORAGE_KEYS.CUSTOM_APPS,
    customApps.map((app) => ({ ...app, value: rename(app.value) })),
  );
  await putJson(STORAGE_KEYS.APP_ID_ALIASES, { ...(await readAliases()), ...Object.fromEntries(renames) });
  await LocalStorage.removeItem(STORAGE_KEYS.MIGRATION_PLAN);
}

async function readAliases(): Promise<Record<string, string>> {
  const stored = await readJson(STORAGE_KEYS.APP_ID_ALIASES);
  return isRecord(stored)
    ? Object.fromEntries(
        Object.entries(stored).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      )
    : {};
}

async function runMigrations() {
  const stored = await readJson(STORAGE_KEYS.SCHEMA_VERSION);
  const version = typeof stored === "number" ? stored : 1;
  if (version >= SCHEMA_VERSION) return;

  if (version < 2) await migrateCustomAppIds();
  await putJson(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION);
}

/** Set while this async call chain holds the storage lock, so nested locked calls don't wait on themselves */
const lockHeld = new AsyncLocalStorage<true>();

function runLocked<T>(operation: () => Promise<T>): Promise<T> {
  if (lockHeld.getStore()) return operation();
  return withFileLock(join(environment.supportPath, "storage"), () => lockHeld.run(true, operation));
}

/**
 * Run a read-modify-write of stored data as one step, across every @ Profile process. Read, decide and write all
 * inside `operation`: a decision made from a read taken before the lock can be stale by the time it's written.
 */
export async function withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  if (lockHeld.getStore()) return operation();
  // Migrate before taking the lock: the migration takes it too, and waiting on it from inside would deadlock
  await ensureMigrated();
  return runLocked(operation);
}

let migration: Promise<void> | undefined;

/**
 * Bring stored data up to the current schema, once per process, under the storage lock so two processes don't
 * migrate at once. Every reader below waits for it. A failure rejects the read, so no caller works from a
 * half-migrated snapshot and writes it back; the next read retries.
 */
function ensureMigrated(): Promise<void> {
  migration ??= runLocked(runMigrations).catch((error) => {
    console.error("LocalStorage migration failed:", error);
    migration = undefined;
    throw error;
  });
  return migration;
}

/** For tests: forget that this process already migrated */
export function resetMigrationState() {
  migration = undefined;
}

/**
 * An app ID as it is after migration. Views remembering an ID from before a migration (the remembered app, History's
 * filter) use it to catch up instead of falling back to a default. Read from storage, so it also follows a migration
 * another process ran.
 */
export async function getMigratedAppId(value: string): Promise<string> {
  await ensureMigrated();
  return (await readAliases())[value] ?? value;
}

export async function getReferencedAppIds(): Promise<Set<string>> {
  await ensureMigrated();
  return readReferencedAppIds();
}

/**
 * Remember History's search text. A plain overwrite of a key nothing else reads, so it needs no lock.
 * Stored as JSON so useLocalStorage reads it back.
 */
export async function saveHistorySearchText(text: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.HISTORY_SEARCH_TEXT, JSON.stringify(text));
}

export async function getCustomApps(): Promise<App[]> {
  await ensureMigrated();
  return readCustomApps();
}

export async function setCustomApps(apps: App[]): Promise<void> {
  await writeJson(STORAGE_KEYS.CUSTOM_APPS, apps);
}

export async function getAppSettings(): Promise<AppSetting[]> {
  await ensureMigrated();
  return readAppSettings();
}

export async function setAppSettings(settings: AppSetting[]): Promise<void> {
  await writeJson(STORAGE_KEYS.APP_SETTINGS, settings);
}

export async function getUsageHistory(): Promise<UsageHistoryItem[]> {
  await ensureMigrated();
  return readUsageHistory();
}

export async function setUsageHistory(history: UsageHistoryItem[]): Promise<void> {
  await writeJson(STORAGE_KEYS.USAGE_HISTORY, history);
}

export async function getStarredPairs(): Promise<string[]> {
  await ensureMigrated();
  return readStarredPairs();
}

export async function setStarredPairs(pairs: string[]): Promise<void> {
  await writeJson(STORAGE_KEYS.STARRED_HISTORY_ITEMS, pairs);
}
