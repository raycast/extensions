import { Tool } from "@raycast/api";
import { Note, noteTitle, noteUrl, Task } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { AmplenoteAuthError, AmplenoteTimeoutError, isConnectionError } from "../lib/mcp";
import { describeRepeat, firstOccurrence, HideRule, hideUntilFor, normalizeRepeat } from "../lib/repeat";
import { taskGroup, taskTitle } from "../lib/tasks";

export function toIsoDate(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

export function compactNote(note: Note) {
  return {
    noteUUID: note.uuid,
    name: noteTitle(note),
    tags: note.tags,
    changed: note.changed ?? note.updated ?? null,
    archived: !!note.archived,
    vault: !!note.vault,
    url: noteUrl(note.uuid),
  };
}

/**
 * Amplenote answers lookups of unknown ids with an output validation error instead of an empty result.
 * Only that (or a null result) means "not found"; every other error is a real failure and is rethrown.
 */
export function nullIfNotFound(error: unknown): null {
  if (error instanceof Error && /output validation error/i.test(error.message)) return null;
  throw error;
}

export function compactTask(task: Task, notes: Map<string, Note>) {
  return {
    taskUUID: task.uuid,
    title: taskTitle(task.content),
    content: task.content ?? "",
    noteUUID: task.noteUUID,
    noteName: notes.get(task.noteUUID)?.name ?? null,
    group: task.completedAt ? "completed" : taskGroup(task),
    startAt: toIsoDate(task.startAt),
    deadline: toIsoDate(task.deadline),
    completedAt: toIsoDate(task.completedAt),
    important: task.important,
    urgent: task.urgent,
  };
}

/**
 * Parses YYYY-MM-DD (scheduled at 9:00 local time) or an ISO date-time into Unix seconds.
 */
export function parseDate(value: string): number {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const date = new Date(dateOnly ? `${value.trim()}T09:00:00` : value.trim());
  if (Number.isNaN(date.getTime())) {
    throw new Error(`"${value}" is not a valid date. Use YYYY-MM-DD or an ISO date-time.`);
  }
  return Math.floor(date.getTime() / 1000);
}

export type ScheduleInput = { startDate?: string; repeat?: string; hideUntil?: HideRule };

/**
 * Works out when a task starts, how it repeats, and when it is hidden until, and checks the combination.
 * Shared by the tools and their confirmations, so the confirmation shows exactly what will be saved.
 */
export function planSchedule(input: ScheduleInput, existingStartAt?: number | null) {
  const given = input.startDate ? new Date(parseDate(input.startDate) * 1000) : undefined;
  const fallback = existingStartAt ? new Date(existingStartAt * 1000) : undefined;
  const base = given ?? fallback;
  if (input.repeat && !base) {
    throw new Error(
      "A repeating task needs a start date for its first occurrence. Pass startDate (YYYY-MM-DD or an ISO date-time).",
    );
  }
  if (input.hideUntil && !base) {
    throw new Error("hideUntil is relative to the start date. Pass startDate (YYYY-MM-DD or an ISO date-time).");
  }
  if (input.repeat && input.hideUntil) {
    throw new Error(
      "hideUntil can't be combined with repeat: Amplenote's MCP would only hide the first occurrence. Leave hideUntil out for repeating tasks.",
    );
  }
  const start = base && input.repeat ? firstOccurrence(base, input.repeat) : base;
  const repeat = input.repeat && start ? normalizeRepeat(input.repeat, start) : undefined;
  return {
    startAt: start ? Math.floor(start.getTime() / 1000) : undefined,
    startChanged: !!start && (!!given || start !== fallback),
    repeat,
    repeatText: repeat ? describeRepeat(repeat) : undefined,
    hideUntil: input.hideUntil && start ? hideUntilFor(start, input.hideUntil) : undefined,
  };
}

const HIDE_LABELS: Record<HideRule, string> = {
  "day-due": "Day task is due",
  "1-day": "1 day before due",
  "2-days": "2 days before due",
  "3-days": "3 days before due",
  "1-week": "1 week before due",
  "1-month": "1 month before due",
};

/** Confirmation rows for repeat and hide-until, built from the same plan the tool will save. */
function formatStart(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function scheduleInfo(input: ScheduleInput, existingStartAt?: number | null) {
  try {
    const plan = planSchedule(input, existingStartAt);
    // The planned start, which may differ from the request (moved to the first day the repeat rule allows).
    const showStart = plan.startAt && (input.startDate || plan.startChanged);
    return [
      ...(showStart ? [{ name: "Start", value: formatStart(plan.startAt!) }] : []),
      ...(plan.repeatText ? [{ name: "Repeats", value: plan.repeatText }] : []),
      ...(input.hideUntil ? [{ name: "Hidden Until", value: HIDE_LABELS[input.hideUntil] }] : []),
    ];
  } catch {
    // The tool itself reports invalid combinations; the confirmation just shows the raw request.
    return [
      ...(input.startDate ? [{ name: "Start", value: input.startDate }] : []),
      ...(input.repeat ? [{ name: "Repeats", value: input.repeat }] : []),
      ...(input.hideUntil ? [{ name: "Hidden Until", value: HIDE_LABELS[input.hideUntil] }] : []),
    ];
  }
}

export async function resolveTargetNote(noteName?: string): Promise<Note> {
  if (!noteName?.trim()) {
    return amplenote.findOrCreateDailyJot();
  }
  const note = await amplenote.findNoteByName(noteName);
  if (!note) {
    throw new Error(`No note named "${noteName}". Use search-notes to find the exact name.`);
  }
  return note;
}

/** Finds the note an AI tool refers to: by id, by exact name, or today's Daily Jot when neither is given. */
export async function resolveNote(input: { noteUUID?: string; noteName?: string }): Promise<Note> {
  const note = await findNote(input);
  return note ?? amplenote.findOrCreateDailyJot();
}

/**
 * Like resolveNote, but never creates anything: returns undefined when today's Daily Jot doesn't exist yet.
 */
export async function findNote(input: { noteUUID?: string; noteName?: string }): Promise<Note | undefined> {
  if (input.noteUUID?.trim()) {
    const note = await amplenote.getNoteMetadata(input.noteUUID.trim()).catch(nullIfNotFound);
    if (!note) throw new Error(`No note with id "${input.noteUUID}". Use search-notes to find note ids.`);
    return note;
  }
  if (input.noteName?.trim()) return resolveTargetNote(input.noteName);
  return amplenote.findDailyJot();
}

export async function requireTask(taskUUID: string): Promise<Task> {
  const task = await amplenote.getTask(taskUUID).catch(nullIfNotFound);
  if (!task) {
    throw new Error(`No task with id "${taskUUID}". Use search-tasks to find task ids.`);
  }
  return task;
}

export function describeError(error: unknown): never {
  if (error instanceof AmplenoteTimeoutError) {
    throw new Error(
      "Amplenote didn't respond in time. If this was a change, it may have been saved anyway: check with search-notes or search-tasks before retrying, so nothing is created twice.",
    );
  }
  if (!isConnectionError(error)) throw error;
  const fix =
    error instanceof AmplenoteAuthError
      ? "Ask the user to check the MCP token in the extension preferences."
      : "Ask the user to open Amplenote and turn on its MCP server.";
  throw new Error(`${error.message} ${fix}`);
}

/** Confirmation shown before an AI tool changes a task: the task text and its note. */
export const taskConfirmation: Tool.Confirmation<{ taskUUID: string }> = async (input) => {
  const task = await requireTask(input.taskUUID);
  const note = await amplenote.getNoteMetadata(task.noteUUID).catch(() => null);
  return {
    info: [
      { name: "Task", value: taskTitle(task.content) },
      ...(note?.name ? [{ name: "Note", value: note.name }] : []),
    ],
  };
};
