import { Note, nowSeconds, Task } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { hasTag } from "../lib/tags";
import { isHidden, taskGroup, taskTitle } from "../lib/tasks";
import { compactTask, describeError } from "./shared";

const MAX_NOTE_LOOKUPS = 25;

type Input = {
  /**
   * Optional text to match against task text and note names.
   */
  query?: string;
  /**
   * Which tasks to return. Defaults to open (all open tasks).
   * Use overdue, today, upcoming, or unscheduled for those groups, or completed for recently completed tasks.
   */
  view?: "open" | "overdue" | "today" | "upcoming" | "unscheduled" | "completed";
  /**
   * Optional tag of the task's note, such as "work". Child tags are included.
   */
  tag?: string;
  /**
   * For view=completed: how many days back to look. Defaults to 7, maximum 90.
   */
  days?: number;
  /**
   * Include open tasks that are hidden until a later date. Defaults to false; hiddenCount tells how many there are.
   */
  includeHidden?: boolean;
  /**
   * Maximum tasks to return. Defaults to 25, maximum 100.
   */
  limit?: number;
};

/**
 * Search Amplenote tasks across all task domains. Returns compact results with task and note ids.
 * Each task has a plain-text title and its raw Markdown content, which keeps links and their URLs.
 * Open tasks are sorted by Amplenote's task score, completed tasks by completion time.
 */
export default async function (input: Input = {}) {
  try {
    const view = input.view ?? "open";
    const [notes, tasks] = await Promise.all([
      amplenote.listNotes("changed"),
      view === "completed"
        ? amplenote.getCompletedTasks(nowSeconds() - Math.min(Math.max(input.days ?? 7, 1), 90) * 86400)
        : amplenote.listOpenTasks().then((result) => result.tasks),
    ]);
    const notesByUUID = new Map<string, Note>(notes.map((note) => [note.uuid, note]));
    // Tasks can live in notes the note list leaves out (plugin notes, for example). Look those up so their
    // name and tags still count for filtering.
    const missing = [...new Set(tasks.map((task) => task.noteUUID))].filter((uuid) => !notesByUUID.has(uuid));
    const found = await Promise.all(
      missing.slice(0, MAX_NOTE_LOOKUPS).map((uuid) => amplenote.getNoteMetadata(uuid).catch(() => null)),
    );
    for (const note of found) if (note) notesByUUID.set(note.uuid, note);

    const query = input.query?.trim().toLowerCase();
    const tag = input.tag?.trim().toLowerCase();
    const matches = tasks
      .filter((task: Task) => view === "open" || view === "completed" || taskGroup(task) === view)
      .filter((task) => !tag || hasTag(notesByUUID.get(task.noteUUID)?.tags ?? [], tag))
      .filter(
        (task) =>
          !query ||
          `${taskTitle(task.content)} ${notesByUUID.get(task.noteUUID)?.name ?? ""}`.toLowerCase().includes(query),
      );
    const hidden = view === "completed" ? [] : matches.filter((task) => isHidden(task));
    const results = (input.includeHidden ? matches : matches.filter((task) => !hidden.includes(task))).sort((a, b) =>
      view === "completed" ? (b.completedAt ?? 0) - (a.completedAt ?? 0) : (b.score ?? 0) - (a.score ?? 0),
    );

    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
    return {
      view,
      total: results.length,
      hiddenCount: input.includeHidden ? 0 : hidden.length,
      tasks: results.slice(0, limit).map((task) => compactTask(task, notesByUUID)),
    };
  } catch (error) {
    describeError(error);
  }
}
