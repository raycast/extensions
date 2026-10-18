import { Note } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { compactTask, describeError, resolveNote } from "./shared";

type Input = {
  /**
   * Optional noteUUID from search-notes. Takes precedence over noteName.
   */
  noteUUID?: string;
  /**
   * Optional exact note name. Omit both noteUUID and noteName to use today's Daily Jot.
   */
  noteName?: string;
  /**
   * Include completed and dismissed tasks. Defaults to false.
   */
  includeDone?: boolean;
};

/**
 * List the tasks in one Amplenote note, including notes that are not part of a task domain.
 * Each task has a plain-text title and its raw Markdown content, which keeps links and their URLs.
 */
export default async function (input: Input = {}) {
  try {
    const note = await resolveNote(input);
    const tasks = await amplenote.getNoteTasks(note.uuid, input.includeDone ?? false);
    const notes = new Map<string, Note>([[note.uuid, note]]);
    return {
      noteUUID: note.uuid,
      noteName: note.name,
      total: tasks.length,
      tasks: tasks.map((task) => compactTask(task, notes)),
    };
  } catch (error) {
    describeError(error);
  }
}
