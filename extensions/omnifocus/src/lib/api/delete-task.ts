import { executeScript } from "../utils/executeScript";

export async function deleteTask(taskId: string) {
  await executeScript(`
    const omnifocus = Application("OmniFocus");
    const doc = omnifocus.defaultDocument();

    const task = doc.flattenedTasks.byId("${taskId}");

    omnifocus.delete(task)
    return true
  `);
}
