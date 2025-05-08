import { CreateOmniFocusTaskOptions, OmniFocusTask } from "../types/task";
import { executeScript } from "../utils/executeScript";
import { assignProjectToTask } from "./assign-project-to-task";
import { assignTagsToTask } from "./assign-tags-to-task";

export async function addTask(options: CreateOmniFocusTaskOptions): Promise<OmniFocusTask> {
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
      console.error("Error assigning tags to task", error);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  if (options.projectName) {
    try {
      console.log("Assigning project to task", task.id, options.projectName);
      await assignProjectToTask(task.id, options.projectName);
    } catch (error) {
      console.error("Error assigning project to task", error);
    }
  }
  return task;
}
