import { LocalStorage } from "@raycast/api";
import { RaycastCommand, Schedule, ScheduleType, ScheduledCommand } from "../types";

export const parseStoredData = <T>(data: string | undefined, fallback: T): T => {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
};

export async function getStoredData<T>(key: string, fallback: T): Promise<T> {
  const stored = await LocalStorage.getItem<string>(key);
  return parseStoredData(stored, fallback);
}

export async function setStoredData<T>(key: string, data: T): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(data));
}

type LoadedScheduledCommands = {
  raw: unknown[];
  commands: ScheduledCommand[];
  indexById: Map<string, number>;
  invalidCount: number;
  migratedCount: number;
};

const SCHEDULE_TYPES: readonly ScheduleType[] = [
  "once",
  "15mins",
  "30mins",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "cron",
];

const COMMAND_TYPES = ["user-initiated", "background"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isScheduleType(value: unknown): value is ScheduleType {
  return typeof value === "string" && (SCHEDULE_TYPES as readonly string[]).includes(value);
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeDateString(value: unknown): string | undefined {
  const str = normalizeString(value);
  if (!str) return undefined;
  return isNaN(Date.parse(str)) ? undefined : str;
}

function normalizeArguments(value: unknown): { args?: Record<string, string>; migrated: boolean } | null {
  if (!isRecord(value)) return null;

  const out: Record<string, string> = {};
  let migrated = false;
  for (const [key, rawVal] of Object.entries(value)) {
    if (typeof rawVal === "string") {
      out[key] = rawVal;
    } else if (rawVal === undefined || rawVal === null) {
      continue;
    } else {
      migrated = true;
      out[key] = String(rawVal);
    }
  }
  return { args: out, migrated };
}

function normalizeRaycastCommand(value: unknown): { command: RaycastCommand; migrated: boolean } | null {
  if (typeof value === "string") {
    const deeplink = normalizeString(value);
    if (!deeplink) return null;
    return { command: { deeplink, type: "background" }, migrated: true };
  }

  if (!isRecord(value)) return null;

  const deeplink = normalizeString(value.deeplink);
  if (!deeplink) return null;

  const typeRaw = normalizeString(value.type);
  const defaultedType = !(typeRaw && (COMMAND_TYPES as readonly string[]).includes(typeRaw));
  const type = (typeRaw && !defaultedType ? typeRaw : "background") as "user-initiated" | "background";

  const argsRaw = value.arguments;
  const argsWereNull = argsRaw === null;
  const argsNormalized = argsRaw === null || argsRaw === undefined ? null : normalizeArguments(argsRaw);
  const argumentsNormalized = argsNormalized?.args;
  const argsMigrated = Boolean(argsNormalized?.migrated);

  return {
    command: {
      deeplink,
      type,
      ...(argumentsNormalized ? { arguments: argumentsNormalized } : {}),
    },
    migrated: defaultedType || argsWereNull || argsMigrated,
  };
}

function normalizeSchedule(value: unknown): { schedule: Schedule; migrated: boolean } | null {
  if (typeof value === "string") {
    if (!isScheduleType(value)) return null;
    return { schedule: { type: value }, migrated: true };
  }

  if (!isRecord(value)) return null;

  if (!isScheduleType(value.type)) return null;

  const schedule: Schedule = { type: value.type };
  const date = normalizeString(value.date);
  const time = normalizeString(value.time);
  const dayOfWeek = value.dayOfWeek;
  const dayOfMonth = value.dayOfMonth;
  const cronExpression = normalizeString(value.cronExpression);

  if (date) schedule.date = date;
  if (time) schedule.time = time;
  if (typeof dayOfWeek === "number" && Number.isFinite(dayOfWeek)) schedule.dayOfWeek = dayOfWeek;
  if (typeof dayOfMonth === "number" && Number.isFinite(dayOfMonth)) schedule.dayOfMonth = dayOfMonth;
  if (cronExpression) schedule.cronExpression = cronExpression;

  return { schedule, migrated: false };
}

function normalizeScheduledCommand(
  value: unknown,
  nowISO: string,
): { command: ScheduledCommand; migrated: boolean } | null {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  if (!id) return null;

  const commandNormalized = normalizeRaycastCommand(value.command);
  const scheduleNormalized = normalizeSchedule(value.schedule);
  if (!commandNormalized || !scheduleNormalized) return null;
  const command = commandNormalized.command;
  const schedule = scheduleNormalized.schedule;

  const nameRaw = normalizeString(value.name);
  const enabledRaw = normalizeBoolean(value.enabled);
  const createdAtRaw = normalizeDateString(value.createdAt);
  const updatedAtRaw = normalizeDateString(value.updatedAt);

  const name = nameRaw ?? command.deeplink;
  const enabled = enabledRaw ?? true;
  const createdAt = createdAtRaw ?? nowISO;
  const updatedAt = updatedAtRaw ?? nowISO;

  const lastExecutedAt = normalizeDateString(value.lastExecutedAt);
  const runIfMissed = normalizeBoolean(value.runIfMissed);
  const lastMissedCheck = normalizeDateString(value.lastMissedCheck);

  const migrated =
    commandNormalized.migrated ||
    scheduleNormalized.migrated ||
    nameRaw === undefined ||
    enabledRaw === undefined ||
    createdAtRaw === undefined ||
    updatedAtRaw === undefined;

  return {
    command: {
      id,
      name,
      command,
      schedule,
      enabled,
      createdAt,
      updatedAt,
      ...(lastExecutedAt ? { lastExecutedAt } : {}),
      ...(runIfMissed !== undefined ? { runIfMissed } : {}),
      ...(lastMissedCheck ? { lastMissedCheck } : {}),
    },
    migrated,
  };
}

export async function loadScheduledCommands(key: string): Promise<LoadedScheduledCommands> {
  const nowISO = new Date().toISOString();
  const stored = await LocalStorage.getItem<string>(key);
  const parsed = parseStoredData<unknown>(stored, []);
  const rawArray: unknown[] = Array.isArray(parsed) ? [...parsed] : [];

  const commands: ScheduledCommand[] = [];
  const validRaw: unknown[] = [];
  const indexById = new Map<string, number>();
  let invalidCount = 0;
  let migratedCount = 0;

  for (let idx = 0; idx < rawArray.length; idx++) {
    const rawEntry = rawArray[idx];
    const normalized = normalizeScheduledCommand(rawEntry, nowISO);

    if (!normalized) {
      invalidCount++;
      console.warn("Dropping invalid scheduled command entry at index", idx, rawEntry);
      continue;
    }

    const validIdx = validRaw.length;
    validRaw.push(normalized.migrated ? normalized.command : rawEntry);

    if (normalized.migrated) {
      migratedCount++;
    }

    commands.push(normalized.command);
    indexById.set(normalized.command.id, validIdx);
  }

  // Count removed invalid entries as migrations so callers know to persist.
  if (invalidCount > 0) {
    migratedCount += invalidCount;
  }

  return { raw: validRaw, commands, indexById, invalidCount, migratedCount };
}
