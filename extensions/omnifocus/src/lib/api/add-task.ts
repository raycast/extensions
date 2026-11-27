import { CreateOmniFocusTaskOptions } from "../types/task";
import { executeScript } from "../utils/executeScript";
import { assignProjectToTask } from "./assign-project-to-task";
import { assignTagsToTask } from "./assign-tags-to-task";

export type AddTaskResult = {
  task: { id: string; name: string };
  /** A planned date was requested but OmniFocus could not store it (requires 4.7+ and a migrated database). */
  plannedDateUnsupported: boolean;
  /** The task was created, but assigning its tags failed. */
  tagAssignmentFailed: boolean;
  /** The task was created, but assigning its project failed, so it stayed in the inbox. */
  projectAssignmentFailed: boolean;
};

type AddTaskScriptResult = { id: string; name: string; plannedDateUnsupported: boolean };

function toISOString(date?: Date | string | null) {
  return date ? new Date(date).toISOString() : null;
}

/**
 * Creates the task in the inbox, then assigns its tags and project.
 *
 * Throws only when the task itself could not be created. Once it exists, tag and project failures are
 * reported in the result instead, so callers don't retry and create a duplicate task.
 */
export async function addTask(options: CreateOmniFocusTaskOptions): Promise<AddTaskResult> {
  const { plannedDateUnsupported, ...task } = await executeScript<AddTaskScriptResult>(
    `
  const omnifocus = Application('OmniFocus');
  const doc = omnifocus.defaultDocument();

  const task = omnifocus.Task({ name: args.name });

  if (args.flagged) {
    task.flagged = true;
  }
  if (args.note) {
    task.note = args.note;
  }
  if (args.deferDate) {
    task.deferDate = new Date(args.deferDate);
  }

  // Planned dates require OmniFocus 4.7+ AND a migrated database. On older versions or an
  // unmigrated database the accessor throws, so guard it and report back instead of failing
  // the whole task creation.
  let plannedDateUnsupported = false;
  if (args.plannedDate) {
    try { task.plannedDate = new Date(args.plannedDate); } catch (e) { plannedDateUnsupported = true; }
  }

  if (args.dueDate) {
    task.dueDate = new Date(args.dueDate);
  }

  doc.inboxTasks.push(task);

  return { id: task.id(), name: task.name(), plannedDateUnsupported };
  `,
    {
      name: options.name,
      flagged: Boolean(options.flagged),
      note: options.note ?? "",
      deferDate: toISOString(options.deferDate),
      plannedDate: toISOString(options.plannedDate),
      dueDate: toISOString(options.dueDate),
    },
  );

  let tagAssignmentFailed = false;
  if (options.tags?.length) {
    try {
      await assignTagsToTask(task.id, options.tags);
    } catch (error) {
      console.error("Error assigning tags to task:", (error as Error).message);
      tagAssignmentFailed = true;
    }
  }

  let projectAssignmentFailed = false;
  if (options.projectId) {
    // NOTE: give OmniFocus some time to process the task before assigning the project
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      await assignProjectToTask(task.id, options.projectId);
    } catch (error) {
      console.error("Error assigning project to task:", (error as Error).message);
      projectAssignmentFailed = true;
    }
  }

  return { task, plannedDateUnsupported, tagAssignmentFailed, projectAssignmentFailed };
}
