import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import fs from "fs";
import path from "path";
import { getLegacyCachePath } from "./cache";

const REGISTRY_FILENAME = "registry.json";
const LEGACY_STORAGE_KEY_CONNECTION = "connectionString";

export type DatabaseType = "postgres" | "mongodb";

export type StoredDatabase = {
  id: string;
  name: string;
  type: DatabaseType;
  connectionString: string;
  lastSyncedAt?: string;
  isDefault?: boolean;
  /** When true, Explore Tables shows only table names (e.g. YT_CHANNELS) instead of schema.table (e.g. public.YT_CHANNELS). Default false. */
  showTableNamesOnly?: boolean;
};

export type DatabaseRegistry = {
  databases: StoredDatabase[];
  defaultId: string | null;
};

function getRegistryPath(): string {
  return path.join(environment.supportPath, REGISTRY_FILENAME);
}

function getSupportPath(): string {
  return environment.supportPath;
}

export function generateDbId(): string {
  return `db_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function readRegistry(): DatabaseRegistry {
  const registryPath = getRegistryPath();
  try {
    if (!fs.existsSync(registryPath)) {
      return { databases: [], defaultId: null };
    }
    const raw = fs.readFileSync(registryPath, "utf-8");
    const data = JSON.parse(raw) as DatabaseRegistry;
    if (!data || !Array.isArray(data.databases)) {
      return { databases: [], defaultId: null };
    }
    return {
      databases: data.databases,
      defaultId: data.defaultId ?? null,
    };
  } catch {
    return { databases: [], defaultId: null };
  }
}

export function writeRegistry(registry: DatabaseRegistry): void {
  const dir = getSupportPath();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2), "utf-8");
}

const MIGRATION_DONE_KEY = "db_schema_explorer_migration_v1_done";

export async function ensureMigratedAsync(): Promise<void> {
  const registryPath = getRegistryPath();
  if (fs.existsSync(registryPath)) return;
  const done = await LocalStorage.getItem<boolean>(MIGRATION_DONE_KEY);
  if (done) return;

  let connectionString = "";
  const fromStorage = await LocalStorage.getItem<string>(LEGACY_STORAGE_KEY_CONNECTION);
  if (fromStorage && String(fromStorage).trim()) connectionString = String(fromStorage).trim();
  if (!connectionString) {
    const prefs = getPreferenceValues<{ connectionString?: string }>();
    const fromPrefs = prefs.connectionString?.trim();
    if (fromPrefs) connectionString = fromPrefs;
  }
  const oldCachePath = getLegacyCachePath();
  const hasOldCache = fs.existsSync(oldCachePath);

  let legacyExclusionRules: { id: string; type: string; pattern: string }[] = [];
  try {
    const stored = await LocalStorage.getItem<string>("exclusionRules");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) legacyExclusionRules = parsed;
    }
  } catch {
    // ignore
  }

  const shouldMigrate = connectionString || hasOldCache || legacyExclusionRules.length > 0;
  if (!shouldMigrate) {
    await LocalStorage.setItem(MIGRATION_DONE_KEY, true);
    return;
  }

  const id = generateDbId();
  const db: StoredDatabase = {
    id,
    name: "My Database",
    type: "postgres",
    connectionString: connectionString || "",
    isDefault: true,
  };
  const registry: DatabaseRegistry = { databases: [db], defaultId: id };
  fs.mkdirSync(getSupportPath(), { recursive: true });
  writeRegistry(registry);

  if (hasOldCache) {
    const newCachePath = path.join(getSupportPath(), `schema-${id}.json`);
    fs.copyFileSync(oldCachePath, newCachePath);
    try {
      fs.unlinkSync(oldCachePath);
    } catch {
      // ignore
    }
  }

  if (legacyExclusionRules.length > 0) {
    const { setExclusionRulesForDb } = await import("./exclusion");
    await setExclusionRulesForDb(id, legacyExclusionRules as import("./exclusion").ExclusionRule[]);
  }

  await LocalStorage.setItem(MIGRATION_DONE_KEY, true);
}

export function getDatabasesSync(): StoredDatabase[] {
  return readRegistry().databases;
}

export async function getDatabases(): Promise<StoredDatabase[]> {
  await ensureMigratedAsync();
  return readRegistry().databases;
}

export function getDatabaseSync(id: string): StoredDatabase | null {
  return readRegistry().databases.find((d) => d.id === id) ?? null;
}

export async function getDatabase(id: string): Promise<StoredDatabase | null> {
  await ensureMigratedAsync();
  return getDatabaseSync(id);
}

export async function addDatabase(db: Omit<StoredDatabase, "id">): Promise<StoredDatabase> {
  await ensureMigratedAsync();
  const registry = readRegistry();
  const id = generateDbId();
  const newDb: StoredDatabase = { ...db, id };
  const nextDatabases = [...registry.databases, newDb];
  const defaultId = !registry.defaultId && nextDatabases.length === 1 ? id : registry.defaultId;
  writeRegistry({ databases: nextDatabases, defaultId });
  return { ...newDb, isDefault: defaultId === id };
}

export async function updateDatabase(id: string, patch: Partial<Omit<StoredDatabase, "id">>): Promise<void> {
  await ensureMigratedAsync();
  const registry = readRegistry();
  const databases = registry.databases.map((d) => (d.id === id ? { ...d, ...patch } : d));
  writeRegistry({ ...registry, databases });
}

export async function removeDatabase(id: string): Promise<void> {
  await ensureMigratedAsync();
  const registry = readRegistry();
  const databases = registry.databases.filter((d) => d.id !== id);
  const defaultId = registry.defaultId === id ? (databases[0]?.id ?? null) : registry.defaultId;
  writeRegistry({ databases, defaultId });
}

export function getDefaultDatabaseSync(): StoredDatabase | null {
  const reg = readRegistry();
  if (reg.defaultId) return reg.databases.find((d) => d.id === reg.defaultId) ?? null;
  return reg.databases[0] ?? null;
}

export async function getDefaultDatabase(): Promise<StoredDatabase | null> {
  await ensureMigratedAsync();
  return getDefaultDatabaseSync();
}

export async function setDefaultDatabase(id: string): Promise<void> {
  await ensureMigratedAsync();
  const registry = readRegistry();
  const databases = registry.databases.map((d) => ({ ...d, isDefault: d.id === id }));
  writeRegistry({ ...registry, databases, defaultId: id });
}
