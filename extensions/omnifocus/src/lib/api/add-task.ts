import { CreateOmniFocusTaskOptions, OmniFocusTask } from "../types/task";
import { executeScript } from "../utils/executeScript";
import { assignProjectToTask } from "./assign-project-to-task";
import { assignTagsToTask } from "./assign-tags-to-task";

type OmniFocusAddTaskResponse =
  | {
      task: OmniFocusTask;
      error?: never;
      /** Set when a planned date was requested but OmniFocus could not store it (requires 4.7+ and a migrated database). */
      plannedDateUnsupported?: boolean;
    }
  | {
      task?: never;
      error: "tag_assignment_failed" | "project_assignment_failed";
      plannedDateUnsupported?: never;
    };

type OmniFocusAddTaskScriptResult = OmniFocusTask & { plannedDateUnsupported?: boolean };
export async function addTask(options: CreateOmniFocusTaskOptions): Promise<OmniFocusAddTaskResponse> {
  const { name, deferDate, plannedDate, flagged, note, dueDate } = options;

  let source = `
  const omnifocus = Application('OmniFocus');
  const doc = omnifocus.defaultDocument();
  
  const task = omnifocus.Task({
    name: \`${name}\`
  });
  `;

  if (flagged) {
    source += `task.flagged = true;\n`;
  }
  if (note) {
    source += `task.note = \`${note}\`;\n`;
  }

  if (deferDate) {
    const dateString = deferDate.toISOString();
    source += `task.deferDate = new Date('${dateString}');\n`;
  }

  // Planned dates require OmniFocus 4.7+ AND a migrated database. On older versions or an
  // unmigrated database the accessor throws, so guard it and report back instead of failing
  // the whole task creation.
  source += `let plannedDateUnsupported = false;\n`;
  if (plannedDate) {
    const dateString = plannedDate.toISOString();
    source += `try { task.plannedDate = new Date('${dateString}'); } catch (e) { plannedDateUnsupported = true; }\n`;
  }

  if (dueDate) {
    source += `task.dueDate = new Date('${dueDate}');\n`;
  }

  source += `doc.inboxTasks.push(task);`;

  source += "return { id: task.id(), name: task.name(), plannedDateUnsupported };";
  const { plannedDateUnsupported, ...task } = await executeScript<OmniFocusAddTaskScriptResult>(source);

  if (options.tags) {
    try {
      await assignTagsToTask(task.id, options.tags);
    } catch (error) {
      console.error("Error assigning tags to task:", (error as Error).message);
      return { error: "tag_assignment_failed" };
    }
  }

  // NOTE: give OmniFocus some time to process the task before assigning the project
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (options.projectName) {
    try {
      await assignProjectToTask(task.id, options.projectName);
    } catch (error) {
      console.error("Error assigning project to task:", (error as Error).message);
      return { error: "project_assignment_failed" };
    }
  }
  return { task, plannedDateUnsupported };
}
