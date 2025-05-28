import { CreateOmniFocusTaskOptions, OmniFocusTask } from "../types/task";
import { executeScript } from "../utils/executeScript";
import { assignProjectToTask } from "./assign-project-to-task";
import { assignTagsToTask } from "./assign-tags-to-task";

type OmniFocusAddTaskResponse =
  | {
      task: OmniFocusTask;
      error?: never;
    }
  | {
      task?: never;
      error: "tag_assignment_failed" | "project_assignment_failed";
    };
export async function addTask(options: CreateOmniFocusTaskOptions): Promise<OmniFocusAddTaskResponse> {
  const { name, deferDate, flagged, note, dueDate } = options;

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

  if (dueDate) {
    source += `task.dueDate = new Date('${dueDate}');\n`;
  }

  source += `doc.inboxTasks.push(task);`;

  source += "return { id: task.id(), name: task.name() };";
  const task = await executeScript<OmniFocusTask>(source);

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
  return { task };
}
