import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  createCalendarEvent as createCalendarEventNative,
  createReminder as createReminderNative,
  listWritableCalendarsJSON,
  listWritableReminderListsJSON,
} from "swift:../../swift";

import { ParsedSchedule } from "./parse-korean-schedule";

export interface CreateCalendarEventOptions {
  preferredCalendarIdentifier?: string;
  recurrence?: CalendarRecurrence;
}

export interface CreateReminderOptions {
  preferredReminderCalendarIdentifier?: string;
}

export class CreationOutcomeUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreationOutcomeUnknownError";
  }
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

class NativeBridgeTimeoutError extends Error {}

const execFileAsync = promisify(execFile);
const OPEN_PAYLOAD_ENV_KEY = "RAYCAST_KOREAN_CALENDAR_OPEN_PAYLOAD";
const OPEN_CALENDAR_TIMEOUT_MS = 10_000;
const NATIVE_BRIDGE_TIMEOUT_MS = 30_000;
const CALENDAR_PERMISSION_GUIDE =
  "Open System Settings > Privacy & Security > Calendars and allow Raycast access, then try again.";
const REMINDER_PERMISSION_GUIDE =
  "Open System Settings > Privacy & Security > Reminders and allow Raycast access, then try again.";
const CALENDAR_PERMISSION_PATTERN =
  /(calendar permission denied|timed out while waiting for calendar permission|not authorized.*calendar|access to calendar.*denied)/iu;
const REMINDER_PERMISSION_PATTERN =
  /(reminders? permission denied|timed out while waiting for reminders? permission|not authorized.*reminders?|access to reminders?.*denied)/iu;
const CHILD_ENV_ALLOWLIST = ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "LC_CTYPE", "USER", "LOGNAME"] as const;
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
  // Continue even if switchView fails.
}

calendarApp.viewCalendar({ at: new Date(payload.startEpochMs) });
`;

export async function listWritableCalendars(): Promise<{
  calendars: WritableCalendar[];
  defaultCalendarIdentifier?: string;
}> {
  try {
    const response = await withNativeBridgeTimeout(
      listWritableCalendarsJSON(),
      "Timed out while waiting for calendar permission",
    );
    const parsed = parseListCalendarsOutput(response);
    const defaultCalendarIdentifier = parsed.defaultCalendarIdentifier;
    const calendars = parsed.calendars.map((calendar) => ({
      ...calendar,
      isDefault: calendar.id === defaultCalendarIdentifier,
    }));

    return { calendars, defaultCalendarIdentifier };
  } catch (error) {
    throw new Error(`Failed to load calendar list: ${toErrorMessage(error)}`);
  }
}

export async function listWritableReminderLists(): Promise<{
  reminderLists: WritableReminderList[];
  defaultReminderListIdentifier?: string;
}> {
  try {
    const response = await withNativeBridgeTimeout(
      listWritableReminderListsJSON(),
      "Timed out while waiting for reminders permission",
    );
    const parsed = parseListReminderListsOutput(response);
    const defaultReminderListIdentifier = parsed.defaultReminderListIdentifier;
    const reminderLists = parsed.reminderLists.map((reminderList) => ({
      ...reminderList,
      isDefault: reminderList.id === defaultReminderListIdentifier,
    }));

    return { reminderLists, defaultReminderListIdentifier };
  } catch (error) {
    throw new Error(`Failed to load reminder list folders: ${toErrorMessage(error)}`);
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

  try {
    const calendarName = await withNativeBridgeTimeout(
      createCalendarEventNative(encodePayload(payload)),
      "Calendar creation timed out",
    );
    return { calendarName: calendarName || "Unknown" };
  } catch (error) {
    if (error instanceof NativeBridgeTimeoutError) {
      throw new CreationOutcomeUnknownError(
        "Calendar did not confirm whether the event was saved. Check Calendar before retrying.",
      );
    }
    throw new Error(`Failed to create Apple Calendar event: ${toErrorMessage(error)}`);
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
    notes: reminder.location ? `Location: ${reminder.location}` : undefined,
    preferredReminderCalendarIdentifier: options.preferredReminderCalendarIdentifier,
  };

  try {
    const reminderListName = await withNativeBridgeTimeout(
      createReminderNative(encodePayload(payload)),
      "Reminder creation timed out",
    );
    return { reminderListName: reminderListName || "Unknown" };
  } catch (error) {
    if (error instanceof NativeBridgeTimeoutError) {
      throw new CreationOutcomeUnknownError(
        "Reminders did not confirm whether the item was saved. Check Reminders before retrying.",
      );
    }
    throw new Error(`Failed to create reminder item: ${toErrorMessage(error)}`);
  }
}

export async function openCalendarAtDate(date: Date): Promise<void> {
  const payload = JSON.stringify({ startEpochMs: date.getTime() });

  try {
    await execFileAsync("osascript", ["-l", "JavaScript", "-e", OPEN_CALENDAR_SCRIPT], {
      env: buildChildEnv({ [OPEN_PAYLOAD_ENV_KEY]: payload }),
      maxBuffer: 1024 * 1024,
      timeout: OPEN_CALENDAR_TIMEOUT_MS,
    });
  } catch (error) {
    throw new Error(`Failed to open Calendar app: ${toErrorMessage(error)}`);
  }
}

function encodePayload(payload: EventKitPayload | ReminderPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function withNativeBridgeTimeout<T>(operation: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new NativeBridgeTimeoutError(message)), NATIVE_BRIDGE_TIMEOUT_MS);
    operation.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
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

function parseListCalendarsOutput(response: string): ListCalendarsOutput {
  try {
    const parsed = JSON.parse(response) as ListCalendarsOutput;
    if (!Array.isArray(parsed.calendars)) {
      throw new Error("Invalid calendars payload");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse calendar list response: ${toErrorMessage(error)}`);
  }
}

function parseListReminderListsOutput(response: string): ListReminderListsOutput {
  try {
    const parsed = JSON.parse(response) as ListReminderListsOutput;
    if (!Array.isArray(parsed.reminderLists)) {
      throw new Error("Invalid reminder lists payload");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse reminder list response: ${toErrorMessage(error)}`);
  }
}

function toErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = String((error as { stderr?: string }).stderr ?? "").trim();
    if (stderr) {
      return withPermissionGuidance(stderr);
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
  return message.includes(guide) ? message : `${message} ${guide}`;
}
