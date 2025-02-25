import { OmniFocusTask } from "../types/task";
import { executeScript } from "../utils/executeScript";

export async function listPerspectiveTasks(perspectiveName?: string): Promise<OmniFocusTask[]> {
  if (!perspectiveName) {
    return [];
  }
  return await executeScript(`
const omnifocus = Application("OmniFocus");
const document = omnifocus.defaultDocument();
const window = document.documentWindows[0];

window.perspectiveName = "${perspectiveName}";

const leaves = window
  .content()
  .leaves()
  .map((l) => {
    const task = l.value();
// NOTE: leaves are possibly not tasks
    try {
      return {
        id: task.id(),
        name: task.name(),
        flagged: task.flagged(),
        deferDate: task.deferDate() ? task.deferDate().toString() : null,
        dueDate: task.dueDate() ? task.dueDate().toString() : null,
        dropped: task.dropped(),
        completed: task.completed(),
        tags: task.tags ? task.tags().map((tt) => tt.name()) : [],
      };
    } catch (e) {
      return null;
    }
  });

return leaves.filter(Boolean);


`);
}
