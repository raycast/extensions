import {
  RawTimesheetEntry,
  NormalizedTimeEntry,
  Project,
  TimesheetEntryInput,
  ClockEntryPayload,
  ClockEntry,
} from "./types";

const START_KEYS = [
  "start",
  "startTime",
  "clockIn",
  "clockInTime",
  "startDateTime",
  "start_datetime",
];
const END_KEYS = [
  "end",
  "endTime",
  "clockOut",
  "clockOutTime",
  "endDateTime",
  "end_datetime",
];

export function extractTimesheetEntries(
  response: unknown,
): RawTimesheetEntry[] {
  if (Array.isArray(response)) {
    return response as RawTimesheetEntry[];
  }

  if (response && typeof response === "object") {
    const maybeEntries =
      (response as Record<string, unknown>).timesheetEntries ??
      (response as Record<string, unknown>).entries;
    if (Array.isArray(maybeEntries)) {
      return maybeEntries as RawTimesheetEntry[];
    }

    const employees = (response as Record<string, unknown>).employees;
    if (Array.isArray(employees)) {
      const entries = employees.flatMap((employee) => {
        if (employee && typeof employee === "object") {
          const employeeEntries = (employee as Record<string, unknown>)
            .timesheetEntries;
          if (Array.isArray(employeeEntries)) {
            return employeeEntries as RawTimesheetEntry[];
          }
        }
        return [];
      });

      if (entries.length > 0) {
        return entries;
      }
    }
  }

  return [];
}

export function normalizeEntry(
  entry: RawTimesheetEntry,
): NormalizedTimeEntry | undefined {
  const startValue = pickFirstString(entry, START_KEYS);
  const endValue = pickFirstString(entry, END_KEYS);

  const start = parseDate(startValue);
  const end = parseDate(endValue);

  const durationMs = calculateDurationMs(entry, start, end);
  const note = pickFirstString(entry, ["note", "comment", "description"]);
  const type = pickFirstString(entry, ["type", "category", "entryType"]);
  const projectId =
    pickFirstText(entry, ["projectId", "project_id", "project"]) ||
    extractNestedString(entry, ["projectInfo", "project", "id"]);
  const projectName =
    pickFirstText(entry, ["projectName", "project_name"]) ||
    extractNestedString(entry, ["projectInfo", "project", "name"]);

  const explicitDate = pickFirstString(entry, ["date", "day"]);
  const date = explicitDate || (start ? formatDate(start) : undefined);

  if (!start && !end && !durationMs) {
    return undefined;
  }

  return {
    id: toStringSafe((entry as Record<string, unknown>).id),
    date,
    start,
    end,
    durationMs,
    note: note ?? undefined,
    type: type ?? undefined,
    projectId: projectId ?? undefined,
    projectName: projectName ?? undefined,
    raw: entry,
  };
}

export function normalizeProjects(response: unknown): Project[] {
  const projects: Project[] = [];

  if (Array.isArray(response)) {
    response.forEach((item) => {
      const p = normalizeProject(item);
      if (p) projects.push(p);
    });
    return projects;
  }

  if (response && typeof response === "object") {
    const maybeProjects =
      (response as Record<string, unknown>).projects ??
      (response as Record<string, unknown>).data ??
      (response as Record<string, unknown>).items;
    if (Array.isArray(maybeProjects)) {
      maybeProjects.forEach((item) => {
        const p = normalizeProject(item);
        if (p) projects.push(p);
      });
    }
  }

  return projects;
}

export function normalizeProject(item: unknown): Project | undefined {
  if (!item || typeof item !== "object") return undefined;
  const id = pickFirstText(item as RawTimesheetEntry, [
    "id",
    "projectId",
    "project_id",
  ]);
  const name = pickFirstText(item as RawTimesheetEntry, [
    "name",
    "projectName",
    "project_name",
  ]);
  if (!id || !name) return undefined;
  return { id, name };
}

export function buildClockEntryPayload(
  input: TimesheetEntryInput,
  employeeId: string,
  entryId?: string,
): ClockEntryPayload {
  const entry: ClockEntry = {
    employeeId: parseInt(employeeId),
    date: input.start.toISOString().split("T")[0],
    start: input.start.toTimeString().substring(0, 5), // HH:MM format
  };

  if (entryId) {
    entry.id = parseInt(entryId);
  }

  if (input.end) {
    entry.end = input.end.toTimeString().substring(0, 5); // HH:MM format
  }

  if (input.note) {
    entry.note = input.note;
  }

  if (input.projectId) {
    entry.projectId = parseInt(input.projectId);
  }

  return { entries: [entry] };
}

export function findOpenEntry(
  entries: NormalizedTimeEntry[],
): NormalizedTimeEntry | undefined {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (!entry.end) {
      return entry;
    }
  }
  return undefined;
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 1000 / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function pickFirstString(
  object: RawTimesheetEntry,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = (object as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function extractNestedString(
  object: RawTimesheetEntry,
  path: string[],
): string | undefined {
  let current: unknown = object;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  if (typeof current === "string") {
    return current;
  }
  if (typeof current === "number") {
    return String(current);
  }
  return undefined;
}

function pickFirstText(
  object: RawTimesheetEntry,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = (object as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function parseDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function calculateDurationMs(
  entry: RawTimesheetEntry,
  start?: Date,
  end?: Date,
): number | undefined {
  if (start && end) {
    return Math.max(0, end.getTime() - start.getTime());
  }

  if (start && !end) {
    return Math.max(0, Date.now() - start.getTime());
  }

  const candidates = [
    (entry as Record<string, unknown>).durationMs,
    (entry as Record<string, unknown>).durationMilliseconds,
    (entry as Record<string, unknown>).durationSeconds,
    (entry as Record<string, unknown>).totalSeconds,
    (entry as Record<string, unknown>).hoursWorked,
    (entry as Record<string, unknown>).totalHours,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && !Number.isNaN(candidate)) {
      if (candidate > 0 && candidate < 24 * 60 * 60) {
        // If the number looks like seconds or hours
        if (candidate <= 24) {
          return candidate * 60 * 60 * 1000;
        }
        return candidate * 1000;
      }
      return candidate;
    }
  }

  return undefined;
}

function toStringSafe(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value);
}
