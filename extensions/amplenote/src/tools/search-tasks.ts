import { Note, nowSeconds, Task } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { hasTag } from "../lib/tags";
import { isHidden, taskGroup, taskTitle } from "../lib/tasks";
import { compactTask, describeError } from "./shared";

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
        : amplenote.listOpenTasks().then((result) => result.tasks.filter((task) => !isHidden(task))),
    ]);
    const notesByUUID = new Map<string, Note>(notes.map((note) => [note.uuid, note]));
    const query = input.query?.trim().toLowerCase();
    const tag = input.tag?.trim().toLowerCase();

    const matches = tasks
      .filter((task: Task) => view === "open" || view === "completed" || taskGroup(task) === view)
      .filter((task) => !tag || hasTag(notesByUUID.get(task.noteUUID)?.tags ?? [], tag))
      .filter(
        (task) =>
          !query ||
          `${taskTitle(task.content)} ${notesByUUID.get(task.noteUUID)?.name ?? ""}`.toLowerCase().includes(query),
      )
      .sort((a, b) =>
        view === "completed" ? (b.completedAt ?? 0) - (a.completedAt ?? 0) : (b.score ?? 0) - (a.score ?? 0),
      );

    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
    return {
      view,
      total: matches.length,
      tasks: matches.slice(0, limit).map((task) => compactTask(task, notesByUUID)),
    };
  } catch (error) {
    describeError(error);
  }
}
