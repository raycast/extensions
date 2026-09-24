import { LocalStorage } from "@raycast/api";
import { copyMissingLegacyWorkLogs } from "./storage-migration";
import type { ActiveTimer, Project, ProjectCategory, WorkLog } from "./types";

export const STORAGE_KEYS = {
  schemaVersion: "schemaVersion",
  projects: "projects",
  projectCategories: "projectCategories",
  legacyWorkLogs: "workLogs",
  workLogsMigrationComplete: "workLogsMigrationComplete",
  activeTimer: "activeTimer",
} as const;

const WORK_LOG_KEY_PREFIX = "workLog:";

export const SCHEMA_VERSION = 1;

const DEFAULT_PROJECT_CATEGORIES: ProjectCategory[] = [
  { id: "client", name: "Client", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "internal", name: "Internal", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
];

export class StorageDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageDataError";
  }
}

export async function initializeStorage(): Promise<void> {
  const version = await LocalStorage.getItem<number>(STORAGE_KEYS.schemaVersion);
  if (version === undefined) {
    await LocalStorage.setItem(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION);
    return;
  }

  if (version !== SCHEMA_VERSION) {
    throw new StorageDataError(`Unsupported data version: ${version}`);
  }
}

export async function getProjects(): Promise<Project[]> {
  await initializeStorage();
  return readArray(STORAGE_KEYS.projects, isProject, "projects");
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await initializeStorage();
  await LocalStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
}

export async function getProjectCategories(): Promise<ProjectCategory[]> {
  await initializeStorage();
  const rawValue = await LocalStorage.getItem<string>(STORAGE_KEYS.projectCategories);
  if (rawValue === undefined) return DEFAULT_PROJECT_CATEGORIES.map((category) => ({ ...category }));
  return readArray(STORAGE_KEYS.projectCategories, isProjectCategory, "project categories");
}

export async function saveProjectCategories(categories: ProjectCategory[]): Promise<void> {
  await initializeStorage();
  await LocalStorage.setItem(STORAGE_KEYS.projectCategories, JSON.stringify(categories));
}

export async function getWorkLogs(): Promise<WorkLog[]> {
  await initializeStorage();
  await migrateLegacyWorkLogs();

  const storedItems = await LocalStorage.allItems<Record<string, string>>();
  const workLogs: WorkLog[] = [];

  for (const [key, rawValue] of Object.entries(storedItems)) {
    if (!key.startsWith(WORK_LOG_KEY_PREFIX)) continue;
    const workLog = parseJson(rawValue, `work log ${key.slice(WORK_LOG_KEY_PREFIX.length)}`);
    if (!isWorkLog(workLog)) {
      throw new StorageDataError(
        `Saved work log ${key.slice(WORK_LOG_KEY_PREFIX.length)} is invalid. Existing data was not overwritten.`,
      );
    }
    workLogs.push(workLog);
  }

  return workLogs;
}

export async function upsertWorkLog(workLog: WorkLog): Promise<WorkLog[]> {
  await initializeStorage();
  await migrateLegacyWorkLogs();
  await LocalStorage.setItem(getWorkLogKey(workLog.id), JSON.stringify(workLog));
  return getWorkLogs();
}

export async function deleteWorkLog(id: string): Promise<WorkLog[]> {
  await initializeStorage();
  await migrateLegacyWorkLogs();
  await LocalStorage.removeItem(getWorkLogKey(id));
  return getWorkLogs();
}

export async function getActiveTimer(): Promise<ActiveTimer | null> {
  await initializeStorage();
  const rawValue = await LocalStorage.getItem<string>(STORAGE_KEYS.activeTimer);
  if (rawValue === undefined) {
    return null;
  }

  const value = parseJson(rawValue, "active timer");
  if (!isActiveTimer(value)) {
    throw new StorageDataError("The saved active timer is invalid. Existing data was not overwritten.");
  }
  return value;
}

export async function saveActiveTimer(activeTimer: ActiveTimer): Promise<void> {
  await initializeStorage();
  await LocalStorage.setItem(STORAGE_KEYS.activeTimer, JSON.stringify(activeTimer));
}

export async function clearActiveTimerIfMatches(id: string): Promise<boolean> {
  const current = await getActiveTimer();
  if (current?.id !== id) {
    return false;
  }
  await LocalStorage.removeItem(STORAGE_KEYS.activeTimer);
  return true;
}

async function readArray<T>(key: string, validator: (value: unknown) => value is T, label: string): Promise<T[]> {
  const rawValue = await LocalStorage.getItem<string>(key);
  if (rawValue === undefined) {
    return [];
  }

  const value = parseJson(rawValue, label);
  if (!Array.isArray(value)) {
    throw new StorageDataError(`Saved ${label} are not an array. Existing data was not overwritten.`);
  }

  const validItems = value.filter(validator);
  if (validItems.length !== value.length) {
    throw new StorageDataError(`Some saved ${label} are invalid. Existing data was not overwritten.`);
  }
  return validItems;
}

async function migrateLegacyWorkLogs(): Promise<void> {
  const migrationComplete = await LocalStorage.getItem<boolean>(STORAGE_KEYS.workLogsMigrationComplete);
  if (migrationComplete === true) return;

  const legacyWorkLogs = await readArray(STORAGE_KEYS.legacyWorkLogs, isWorkLog, "work logs");
  await copyMissingLegacyWorkLogs(legacyWorkLogs, LocalStorage, getWorkLogKey);
  await LocalStorage.setItem(STORAGE_KEYS.workLogsMigrationComplete, true);
}

function getWorkLogKey(id: string): string {
  return `${WORK_LOG_KEY_PREFIX}${id}`;
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    console.error(`Could not parse saved ${label}`, error);
    throw new StorageDataError(`Could not parse saved ${label}. Existing data was not overwritten.`);
  }
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.type) &&
    typeof value.isActive === "boolean" &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  );
}

function isWorkLog(value: unknown): value is WorkLog {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.projectId) &&
    typeof value.description === "string" &&
    isIsoDate(value.startedAt) &&
    isIsoDate(value.endedAt) &&
    new Date(value.endedAt).getTime() > new Date(value.startedAt).getTime() &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  );
}

function isActiveTimer(value: unknown): value is ActiveTimer {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.projectId) &&
    typeof value.description === "string" &&
    isIsoDate(value.startedAt)
  );
}

function isProjectCategory(value: unknown): value is ProjectCategory {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}
