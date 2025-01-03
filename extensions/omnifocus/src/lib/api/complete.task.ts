import { executeScript } from "../utils/executeScript";

export async function completeTask(taskId: string) {
  await executeScript(`
    const omnifocus = Application("OmniFocus");
    const doc = omnifocus.defaultDocument();

    const task = doc.flattenedTasks.byId("${taskId}");

    omnifocus.markComplete(task)
    return true
  `);
}
