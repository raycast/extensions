import { LocalStorage } from "@raycast/api";
import { copyMissingLegacyWorkLogs } from "./storage-migration";
import { planForDate, isSavedPlan, isPlanDate, isPlanReference } from "./planning";
import type { ActiveTimer, SavedPlan, Project, ProjectCategory, WorkLog } from "./types";

export const STORAGE_KEYS = {
  schemaVersion: "schemaVersion",
  projects: "projects",
  projectCategories: "projectCategories",
  legacyWorkLogs: "workLogs",
  workLogsMigrationComplete: "workLogsMigrationComplete",
  activeTimer: "activeTimer",
} as const;

const WORK_LOG_KEY_PREFIX = "workLog:";
// Keep the original on-disk keys when renaming goals to plans.
const PLAN_KEY_PREFIX = "dailyGoal:";
const PLAN_ORDER_KEY_PREFIX = "dailyGoalOrder:";

export const SCHEMA_VERSION = 1;

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

export async function getProjectGroups(): Promise<ProjectCategory[]> {
  await initializeStorage();
  return readArray(STORAGE_KEYS.projectCategories, isProjectGroup, "project groups");
}

export async function saveProjectGroups(categories: ProjectCategory[]): Promise<void> {
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

export async function getPlans(date?: string): Promise<SavedPlan[]> {
  await initializeStorage();
  const items = await LocalStorage.allItems<Record<string, string>>();
  const goals = Object.entries(items)
    .filter(([key]) => key.startsWith(PLAN_KEY_PREFIX))
    .map(([key, raw]) => {
      const goal = parseJson(raw, "daily goal");
      if (!isSavedPlan(goal) || `${PLAN_KEY_PREFIX}${goal.id}` !== key) {
        throw new StorageDataError("Saved daily goal is invalid. Existing data was not overwritten.");
      }
      return goal;
    })
    .flatMap((goal) => {
      const visible = date ? planForDate(goal, date) : goal;
      return visible ? [visible] : [];
    });
  const positions = new Map<string, number>();
  for (const date of new Set(goals.map((goal) => goal.date))) {
    const raw = items[`${PLAN_ORDER_KEY_PREFIX}${date}`];
    if (raw !== undefined) {
      const ids = parseJson(raw, "daily goal order");
      if (!isPlanOrder(ids))
        throw new StorageDataError("Saved goal order is invalid. Existing data was not overwritten.");
      ids.forEach((id, index) => positions.set(id, index));
    }
  }
  return goals.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}

// A single write preserves the complete parent order without partial multi-goal updates.
export async function savePlanOrder(date: string, ids: string[]): Promise<void> {
  await initializeStorage();
  if (!isPlanDate(date) || !isPlanOrder(ids)) throw new StorageDataError("Daily goal order is invalid");
  await LocalStorage.setItem(`${PLAN_ORDER_KEY_PREFIX}${date}`, JSON.stringify(ids));
}

function isPlanOrder(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((id) => typeof id === "string" && id.length > 0) &&
    new Set(value).size === value.length
  );
}

export async function getPlan(id: string): Promise<SavedPlan | undefined> {
  await initializeStorage();
  const raw = await LocalStorage.getItem<string>(`${PLAN_KEY_PREFIX}${id}`);
  if (raw === undefined) return undefined;
  const goal = parseJson(raw, "daily goal");
  if (!isSavedPlan(goal) || goal.id !== id)
    throw new StorageDataError("Saved daily goal is invalid. Existing data was not overwritten.");
  return goal;
}

// Callers serialize plan mutations with the same lock as timer changes.
export async function savePlan(goal: SavedPlan): Promise<void> {
  await initializeStorage();
  if (!isSavedPlan(goal)) throw new StorageDataError("Daily goal is invalid");
  await LocalStorage.setItem(`${PLAN_KEY_PREFIX}${goal.id}`, JSON.stringify(goal));
}

export async function deletePlan(id: string): Promise<void> {
  await initializeStorage();
  await LocalStorage.removeItem(`${PLAN_KEY_PREFIX}${id}`);
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
    (value.plan === undefined || isPlanReference(value.plan)) &&
    isIsoDate(value.startedAt) &&
    isIsoDate(value.endedAt) &&
    new Date(value.endedAt).getTime() >= new Date(value.startedAt).getTime() &&
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
    (value.plan === undefined || isPlanReference(value.plan)) &&
    isIsoDate(value.startedAt)
  );
}

function isProjectGroup(value: unknown): value is ProjectCategory {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    (value.icon === undefined || typeof value.icon === "string") &&
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
