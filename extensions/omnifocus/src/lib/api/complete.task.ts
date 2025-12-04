import { executeScript } from "../utils/executeScript";

export async function completeTask(taskId: string) {
  await executeScript(`
    const omnifocus = Application("OmniFocus");
    const doc = omnifocus.defaultDocument();

    const task = doc.flattenedTasks.byId("${taskId}");

    omnifocus.markComplete(task)
    return true
  `);

  // NOTE: the task is not immediately removed from perspectives
  await new Promise((r) => setTimeout(r, 500));
}
