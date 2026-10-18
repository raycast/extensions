import { Tool } from "@raycast/api";
import { Note, noteTitle, noteUrl, Task } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { AmplenoteAuthError, isConnectionError } from "../lib/mcp";
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
    url: noteUrl(note.uuid),
  };
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
  if (input.noteUUID?.trim()) {
    const note = await amplenote.getNoteMetadata(input.noteUUID.trim()).catch((error) => {
      if (isConnectionError(error)) throw error;
      return null;
    });
    if (!note) throw new Error(`No note with id "${input.noteUUID}". Use search-notes to find note ids.`);
    return note;
  }
  return resolveTargetNote(input.noteName);
}

export async function requireTask(taskUUID: string): Promise<Task> {
  const task = await amplenote.getTask(taskUUID).catch((error) => {
    if (isConnectionError(error)) throw error;
    return null;
  });
  if (!task) {
    throw new Error(`No task with id "${taskUUID}". Use search-tasks to find task ids.`);
  }
  return task;
}

export function describeError(error: unknown): never {
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
