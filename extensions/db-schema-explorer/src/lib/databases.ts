import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import fs from "fs";
import path from "path";
import { getLegacyCachePath } from "./cache";
import {
  getAllDatabaseCredentials,
  getDatabaseCredential,
  removeDatabaseCredential,
  setDatabaseCredential,
} from "./credentials";

const REGISTRY_FILENAME = "registry.json";
const LEGACY_STORAGE_KEY_CONNECTION = "connectionString";

export type DatabaseType = "postgres" | "mongodb";

export type StoredDatabase = {
  id: string;
  name: string;
  type: DatabaseType;
  connectionString?: string;
  lastSyncedAt?: string;
  isDefault?: boolean;
  /** When true, Explore Tables shows only table names (e.g. YT_CHANNELS) instead of schema.table (e.g. public.YT_CHANNELS). Default false. */
  showTableNamesOnly?: boolean;
};

type PersistedDatabase = Omit<StoredDatabase, "connectionString">;

export type DatabaseRegistry = {
  databases: PersistedDatabase[];
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

function normalizeDatabase(raw: unknown): PersistedDatabase | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const type = item.type;
  if (typeof item.id !== "string" || typeof item.name !== "string" || (type !== "postgres" && type !== "mongodb")) {
    return null;
  }
  return {
    id: item.id,
    name: item.name,
    type,
    lastSyncedAt: typeof item.lastSyncedAt === "string" ? item.lastSyncedAt : undefined,
    isDefault: typeof item.isDefault === "boolean" ? item.isDefault : undefined,
    showTableNamesOnly: typeof item.showTableNamesOnly === "boolean" ? item.showTableNamesOnly : undefined,
  };
}

export function readRegistry(): DatabaseRegistry {
  const registryPath = getRegistryPath();
  try {
    if (!fs.existsSync(registryPath)) {
      return { databases: [], defaultId: null };
    }
    const raw = fs.readFileSync(registryPath, "utf-8");
    const data = JSON.parse(raw) as { databases?: unknown[]; defaultId?: unknown };
    if (!data || !Array.isArray(data.databases)) {
      return { databases: [], defaultId: null };
    }
    const databases = data.databases
      .map((item) => normalizeDatabase(item))
      .filter((item): item is PersistedDatabase => !!item);
    return {
      databases,
      defaultId: typeof data.defaultId === "string" ? data.defaultId : null,
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

async function migrateRegistryCredentialsIfNeeded(): Promise<void> {
  const registryPath = getRegistryPath();
  if (!fs.existsSync(registryPath)) return;
  try {
    const raw = fs.readFileSync(registryPath, "utf-8");
    const parsed = JSON.parse(raw) as { databases?: unknown[] };
    if (!parsed || !Array.isArray(parsed.databases)) return;
    let sawLegacyConnectionStrings = false;
    for (const item of parsed.databases) {
      if (!item || typeof item !== "object") continue;
      const db = item as Record<string, unknown>;
      if ("connectionString" in db) {
        sawLegacyConnectionStrings = true;
        const dbId = typeof db.id === "string" ? db.id : null;
        const connectionString = typeof db.connectionString === "string" ? db.connectionString.trim() : "";
        if (dbId && connectionString) {
          await setDatabaseCredential(dbId, connectionString);
        }
      }
    }
    if (sawLegacyConnectionStrings) {
      // Rewrite file through normalized shape to drop plaintext credentials.
      writeRegistry(readRegistry());
    }
  } catch {
    // ignore corrupt legacy file and continue with best effort
  }
}

async function withCredentials(databases: PersistedDatabase[]): Promise<StoredDatabase[]> {
  const credentialsById = await getAllDatabaseCredentials();
  return databases.map((db) => ({ ...db, connectionString: credentialsById[db.id] ?? "" }));
}

export async function ensureMigratedAsync(): Promise<void> {
  const registryPath = getRegistryPath();
  if (fs.existsSync(registryPath)) {
    await migrateRegistryCredentialsIfNeeded();
    return;
  }
  const done = await LocalStorage.getItem<boolean>(MIGRATION_DONE_KEY);
  if (done) return;

  let connectionString = "";
  const fromStorage = await LocalStorage.getItem<string>(LEGACY_STORAGE_KEY_CONNECTION);
  if (fromStorage && String(fromStorage).trim()) connectionString = String(fromStorage).trim();
  if (!connectionString) {
    // Legacy migration: check for connectionString preference that may no longer exist in Preferences type
    const prefs = getPreferenceValues<Preferences>();
    const fromPrefs = (prefs as Record<string, unknown>).connectionString;
    if (typeof fromPrefs === "string" && fromPrefs.trim()) connectionString = fromPrefs.trim();
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
  const db: PersistedDatabase = {
    id,
    name: "My Database",
    type: "postgres",
    isDefault: true,
  };
  const registry: DatabaseRegistry = { databases: [db], defaultId: id };
  fs.mkdirSync(getSupportPath(), { recursive: true });
  writeRegistry(registry);
  if (connectionString) {
    await setDatabaseCredential(id, connectionString);
  }

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
  return readRegistry().databases.map((db) => ({ ...db, connectionString: "" }));
}

export async function getDatabases(): Promise<StoredDatabase[]> {
  await ensureMigratedAsync();
  return withCredentials(readRegistry().databases);
}

export function getDatabaseSync(id: string): StoredDatabase | null {
  const db = readRegistry().databases.find((d) => d.id === id);
  return db ? { ...db, connectionString: "" } : null;
}

export async function getDatabase(id: string): Promise<StoredDatabase | null> {
  await ensureMigratedAsync();
  const db = readRegistry().databases.find((d) => d.id === id);
  if (!db) return null;
  const connectionString = await getDatabaseCredential(id);
  return { ...db, connectionString };
}

export async function addDatabase(
  db: Omit<StoredDatabase, "id"> & { connectionString: string },
): Promise<StoredDatabase> {
  await ensureMigratedAsync();
  const registry = readRegistry();
  const id = generateDbId();
  const { connectionString, ...meta } = db;
  const newDb: PersistedDatabase = { ...meta, id };
  const nextDatabases = [...registry.databases, newDb];
  const defaultId = !registry.defaultId && nextDatabases.length === 1 ? id : registry.defaultId;
  writeRegistry({ databases: nextDatabases, defaultId });
  await setDatabaseCredential(id, connectionString);
  return { ...newDb, isDefault: defaultId === id, connectionString: connectionString.trim() };
}

export async function updateDatabase(id: string, patch: Partial<Omit<StoredDatabase, "id">>): Promise<void> {
  await ensureMigratedAsync();
  const { connectionString, ...metaPatch } = patch;
  const registry = readRegistry();
  const databases = registry.databases.map((d) => (d.id === id ? { ...d, ...metaPatch } : d));
  writeRegistry({ ...registry, databases });
  if (connectionString !== undefined) {
    await setDatabaseCredential(id, connectionString);
  }
}

export async function removeDatabase(id: string): Promise<void> {
  await ensureMigratedAsync();
  const registry = readRegistry();
  const databases = registry.databases.filter((d) => d.id !== id);
  const defaultId = registry.defaultId === id ? (databases[0]?.id ?? null) : registry.defaultId;
  writeRegistry({ databases, defaultId });
  await removeDatabaseCredential(id);
}

export function getDefaultDatabaseSync(): StoredDatabase | null {
  const reg = readRegistry();
  const db = reg.defaultId ? (reg.databases.find((d) => d.id === reg.defaultId) ?? null) : (reg.databases[0] ?? null);
  return db ? { ...db, connectionString: "" } : null;
}

export async function getDefaultDatabase(): Promise<StoredDatabase | null> {
  await ensureMigratedAsync();
  const reg = readRegistry();
  const db = reg.defaultId ? (reg.databases.find((d) => d.id === reg.defaultId) ?? null) : (reg.databases[0] ?? null);
  if (!db) return null;
  const connectionString = await getDatabaseCredential(db.id);
  return { ...db, connectionString };
}

export async function setDefaultDatabase(id: string): Promise<void> {
  await ensureMigratedAsync();
  const registry = readRegistry();
  const databases = registry.databases.map((d) => ({ ...d, isDefault: d.id === id }));
  writeRegistry({ ...registry, databases, defaultId: id });
}
