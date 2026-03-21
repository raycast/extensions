import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, chmod, lstat, mkdir, readFile, rename, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { ParsedSchedule } from "./parse-korean-schedule";

export interface CreateCalendarEventOptions {
  preferredCalendarIdentifier?: string;
  recurrence?: CalendarRecurrence;
}

export interface CreateReminderOptions {
  preferredReminderCalendarIdentifier?: string;
}

export interface WritableCalendar {
  id: string;
  title: string;
  sourceTitle: string;
  isDefault: boolean;
}

export interface WritableReminderList {
  id: string;
  title: string;
  sourceTitle: string;
  isDefault: boolean;
}

interface ListCalendarsOutput {
  defaultCalendarIdentifier?: string;
  calendars: Array<{
    id: string;
    title: string;
    sourceTitle: string;
  }>;
}

interface ListReminderListsOutput {
  defaultReminderListIdentifier?: string;
  reminderLists: Array<{
    id: string;
    title: string;
    sourceTitle: string;
  }>;
}

interface EventKitPayload {
  title: string;
  startEpochMs: number;
  endEpochMs: number;
  location?: string;
  allDay: boolean;
  preferredCalendarIdentifier?: string;
  recurrence?: CalendarRecurrencePayload;
}

interface ReminderPayload {
  title: string;
  dueEpochMs: number;
  allDay: boolean;
  notes?: string;
  preferredReminderCalendarIdentifier?: string;
}

export interface CalendarRecurrence {
  frequency: "daily" | "weekly" | "monthly";
  interval?: number;
  weekday?: number;
  dayOfMonth?: number;
  end: CalendarRecurrenceEnd;
}

export type CalendarRecurrenceEnd =
  | {
      type: "count";
      count: number;
    }
  | {
      type: "until";
      untilEpochMs: number;
    };

interface CalendarRecurrencePayload {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  weekday?: number;
  dayOfMonth?: number;
  end: CalendarRecurrenceEndPayload;
}

type CalendarRecurrenceEndPayload =
  | {
      type: "count";
      count: number;
    }
  | {
      type: "until";
      untilEpochMs: number;
    };

const execFileAsync = promisify(execFile);
const ADD_EVENT_SCRIPT_PATH = path.join(environment.assetsPath, "add_event.swift");
const LIST_CALENDARS_SCRIPT_PATH = path.join(environment.assetsPath, "list_calendars.swift");
const ADD_REMINDER_SCRIPT_PATH = path.join(environment.assetsPath, "add_reminder.swift");
const LIST_REMINDER_LISTS_SCRIPT_PATH = path.join(environment.assetsPath, "list_reminder_lists.swift");
const SWIFT_BINARY_CACHE_ROOT = path.join(
  os.tmpdir(),
  `raycast-korean-calendar-swift-${typeof process.getuid === "function" ? process.getuid() : "unknown"}`,
);
const SWIFT_BINARY_DISABLE_CACHE_ENV_KEY = "RAYCAST_KOREAN_CALENDAR_DISABLE_SWIFT_BINARY_CACHE";
const OPEN_PAYLOAD_ENV_KEY = "RAYCAST_KOREAN_CALENDAR_OPEN_PAYLOAD";
const CALENDAR_PERMISSION_GUIDE =
  "시스템 설정 > 개인정보 보호 및 보안 > 캘린더에서 Raycast 권한을 허용한 뒤 다시 시도해 주세요.";
const REMINDER_PERMISSION_GUIDE =
  "시스템 설정 > 개인정보 보호 및 보안 > 미리알림에서 Raycast 권한을 허용한 뒤 다시 시도해 주세요.";
const CALENDAR_PERMISSION_PATTERN =
  /(calendar permission denied|timed out while waiting for calendar permission|not authorized.*calendar|access to calendar.*denied)/iu;
const REMINDER_PERMISSION_PATTERN =
  /(reminders? permission denied|timed out while waiting for reminders? permission|not authorized.*reminders?|access to reminders?.*denied)/iu;
const CHILD_ENV_ALLOWLIST = [
  "PATH",
  "HOME",
  "TMPDIR",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "USER",
  "LOGNAME",
  "DEVELOPER_DIR",
  "SDKROOT",
] as const;
const OPEN_CALENDAR_SCRIPT = `
ObjC.import("stdlib");

const rawPayload = $.getenv("${OPEN_PAYLOAD_ENV_KEY}");
if (!rawPayload) {
  throw new Error("Missing open payload");
}

const payload = JSON.parse(ObjC.unwrap(rawPayload));
const calendarApp = Application("Calendar");
calendarApp.activate();

try {
  calendarApp.switchView({ to: "day view" });
} catch (_) {
  // switchView가 실패해도 날짜 이동은 계속 진행한다.
}

calendarApp.viewCalendar({ at: new Date(payload.startEpochMs) });
`;

export async function listWritableCalendars(): Promise<{
  calendars: WritableCalendar[];
  defaultCalendarIdentifier?: string;
}> {
  try {
    const stdout = await runSwiftScript(LIST_CALENDARS_SCRIPT_PATH);
    const parsed = parseListCalendarsOutput(stdout);
    const defaultCalendarIdentifier = parsed.defaultCalendarIdentifier;
    const calendars = parsed.calendars.map((calendar) => ({
      ...calendar,
      isDefault: calendar.id === defaultCalendarIdentifier,
    }));

    return {
      calendars,
      defaultCalendarIdentifier,
    };
  } catch (error) {
    throw new Error(`캘린더 목록을 불러오지 못했습니다: ${toErrorMessage(error)}`);
  }
}

export async function listWritableReminderLists(): Promise<{
  reminderLists: WritableReminderList[];
  defaultReminderListIdentifier?: string;
}> {
  try {
    const stdout = await runSwiftScript(LIST_REMINDER_LISTS_SCRIPT_PATH);
    const parsed = parseListReminderListsOutput(stdout);
    const defaultReminderListIdentifier = parsed.defaultReminderListIdentifier;
    const reminderLists = parsed.reminderLists.map((reminderList) => ({
      ...reminderList,
      isDefault: reminderList.id === defaultReminderListIdentifier,
    }));

    return {
      reminderLists,
      defaultReminderListIdentifier,
    };
  } catch (error) {
    throw new Error(`미리알림 폴더 목록을 불러오지 못했습니다: ${toErrorMessage(error)}`);
  }
}

export async function createAppleCalendarEvent(
  event: ParsedSchedule,
  options: CreateCalendarEventOptions = {},
): Promise<{ calendarName: string }> {
  const payload: EventKitPayload = {
    title: event.title,
    startEpochMs: event.start.getTime(),
    endEpochMs: event.end.getTime(),
    location: event.location,
    allDay: event.allDay,
    preferredCalendarIdentifier: options.preferredCalendarIdentifier,
    recurrence: options.recurrence ? normalizeRecurrencePayload(options.recurrence) : undefined,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");

  try {
    const stdout = await runSwiftScript(ADD_EVENT_SCRIPT_PATH, [encodedPayload]);
    return { calendarName: stdout || "알 수 없음" };
  } catch (error) {
    throw new Error(`Apple Calendar에 일정을 추가하지 못했습니다: ${toErrorMessage(error)}`);
  }
}

export async function createAppleReminder(
  reminder: ParsedSchedule,
  options: CreateReminderOptions = {},
): Promise<{ reminderListName: string }> {
  const payload: ReminderPayload = {
    title: reminder.title,
    dueEpochMs: reminder.start.getTime(),
    allDay: reminder.allDay,
    notes: reminder.location ? `장소: ${reminder.location}` : undefined,
    preferredReminderCalendarIdentifier: options.preferredReminderCalendarIdentifier,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");

  try {
    const stdout = await runSwiftScript(ADD_REMINDER_SCRIPT_PATH, [encodedPayload]);
    return { reminderListName: stdout || "알 수 없음" };
  } catch (error) {
    throw new Error(`미리알림에 항목을 추가하지 못했습니다: ${toErrorMessage(error)}`);
  }
}

export async function openCalendarAtDate(date: Date): Promise<void> {
  const payload = JSON.stringify({ startEpochMs: date.getTime() });

  try {
    await execFileAsync("osascript", ["-l", "JavaScript", "-e", OPEN_CALENDAR_SCRIPT], {
      env: buildChildEnv({ [OPEN_PAYLOAD_ENV_KEY]: payload }),
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`Calendar 앱을 열지 못했습니다: ${toErrorMessage(error)}`);
  }
}

async function runSwiftScript(scriptPath: string, args: string[] = []): Promise<string> {
  await access(scriptPath);

  const command = await resolveSwiftCommand(scriptPath);
  const runtimeArgs = command.mode === "compiled" ? args : [scriptPath, ...args];
  const executable = command.mode === "compiled" ? command.binaryPath : "swift";

  const { stdout } = await execFileAsync(executable, runtimeArgs, {
    env: buildChildEnv(),
    maxBuffer: 1024 * 1024,
  });

  return stdout.trim();
}

async function resolveSwiftCommand(
  scriptPath: string,
): Promise<{ mode: "compiled"; binaryPath: string } | { mode: "interpreted" }> {
  if (process.env[SWIFT_BINARY_DISABLE_CACHE_ENV_KEY] === "1") {
    return { mode: "interpreted" };
  }

  try {
    const binaryPath = await ensureCompiledSwiftBinary(scriptPath);
    return { mode: "compiled", binaryPath };
  } catch {
    return { mode: "interpreted" };
  }
}

async function ensureCompiledSwiftBinary(scriptPath: string): Promise<string> {
  await ensureSecureCacheRoot();

  const scriptBytes = await readFile(scriptPath);
  const scriptHash = createHash("sha256").update(scriptBytes).digest("hex").slice(0, 16);
  const scriptBaseName = path.basename(scriptPath, ".swift");
  const binaryPath = path.join(SWIFT_BINARY_CACHE_ROOT, `${scriptBaseName}-${scriptHash}`);

  if (await isExecutable(binaryPath)) {
    return binaryPath;
  }

  const tempBinaryPath = `${binaryPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await execFileAsync("swiftc", ["-O", scriptPath, "-o", tempBinaryPath], {
      env: buildChildEnv(),
      maxBuffer: 1024 * 1024 * 16,
    });
    await chmod(tempBinaryPath, 0o755);
    await rename(tempBinaryPath, binaryPath);
  } catch (error) {
    await safeUnlink(tempBinaryPath);
    throw error;
  }

  return binaryPath;
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureSecureCacheRoot(): Promise<void> {
  await mkdir(SWIFT_BINARY_CACHE_ROOT, { recursive: true, mode: 0o700 });
  const stats = await lstat(SWIFT_BINARY_CACHE_ROOT);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error("Invalid Swift binary cache directory");
  }
  await chmod(SWIFT_BINARY_CACHE_ROOT, 0o700);
}

function buildChildEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of CHILD_ENV_ALLOWLIST) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) {
      env[key] = value;
    }
  }

  if (!env.PATH) {
    env.PATH = "/usr/bin:/bin:/usr/sbin:/sbin";
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }

  return env;
}

async function safeUnlink(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // noop
  }
}

function parseListCalendarsOutput(stdout: string): ListCalendarsOutput {
  try {
    const parsed = JSON.parse(stdout) as ListCalendarsOutput;
    if (!Array.isArray(parsed.calendars)) {
      throw new Error("Invalid calendars payload");
    }
    return parsed;
  } catch (error) {
    throw new Error(`캘린더 목록 응답을 파싱하지 못했습니다: ${toErrorMessage(error)}`);
  }
}

function parseListReminderListsOutput(stdout: string): ListReminderListsOutput {
  try {
    const parsed = JSON.parse(stdout) as ListReminderListsOutput;
    if (!Array.isArray(parsed.reminderLists)) {
      throw new Error("Invalid reminder lists payload");
    }
    return parsed;
  } catch (error) {
    throw new Error(`미리알림 폴더 목록 응답을 파싱하지 못했습니다: ${toErrorMessage(error)}`);
  }
}

function toErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = String((error as { stderr?: string }).stderr ?? "").trim();
    if (stderr) {
      return withPermissionGuidance(stderr.replace(/^ERROR:\s*/u, ""));
    }
  }

  if (error instanceof Error) {
    return withPermissionGuidance(error.message);
  }

  return withPermissionGuidance(String(error));
}

function normalizeRecurrencePayload(recurrence: CalendarRecurrence): CalendarRecurrencePayload {
  const interval =
    Number.isFinite(recurrence.interval) && (recurrence.interval ?? 0) > 0 ? (recurrence.interval ?? 1) : 1;
  return {
    frequency: recurrence.frequency,
    interval,
    weekday: recurrence.weekday,
    dayOfMonth: recurrence.dayOfMonth,
    end: recurrence.end,
  };
}

function withPermissionGuidance(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (REMINDER_PERMISSION_PATTERN.test(trimmed)) {
    return appendGuide(trimmed, REMINDER_PERMISSION_GUIDE);
  }

  if (CALENDAR_PERMISSION_PATTERN.test(trimmed)) {
    return appendGuide(trimmed, CALENDAR_PERMISSION_GUIDE);
  }

  return trimmed;
}

function appendGuide(message: string, guide: string): string {
  if (message.includes(guide)) {
    return message;
  }
  return `${message} ${guide}`;
}
