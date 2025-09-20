import { OmniFocusTask } from "../types/task";
import { executeScript } from "../utils/executeScript";
import { showFailureToast } from "@raycast/utils";

export async function listPerspectiveTasks(perspectiveName?: string): Promise<OmniFocusTask[]> {
  if (!perspectiveName) {
    return [];
  }
  const result = await executeScript<string>(`
const omnifocus = Application("OmniFocus");
const document = omnifocus.defaultDocument();
const window = document.documentWindows[0];

window.perspectiveName = \`${perspectiveName}\`;

function safeString(value) {
  return value !== undefined ? value.toString() : null;
}

const leaves = window
  .content()
  .leaves()
  .map((l) => {
    const task = l.value();
    // NOTE: leaves are possibly not tasks
    try {
      const containingProject = task.containingProject();
      const taskData = {
        id: task.id(),
        name: task.name(),
        flagged: task.flagged(),
        deferDate: task.deferDate() ? safeString(task.deferDate()) : null,
        dueDate: task.dueDate() ? safeString(task.dueDate()) : null,
        dropped: task.dropped(),
        completed: task.completed(),
        tags: task.tags ? task.tags().map((tt) => tt.name()) : [],
        note: task.note ? safeString(task.note()) : null,
        projectName: containingProject ? safeString(containingProject.name()) : null
      };
      return taskData;
    } catch (e) {
      console.error('Error processing task:', e);
      return null;
    }
  });

const validLeaves = leaves.filter(Boolean);
return JSON.stringify(validLeaves);
`);

  // Parse the JSON string back into an array of tasks
  try {
    return JSON.parse(result) as OmniFocusTask[];
  } catch (e) {
    await showFailureToast("Failed to load tasks from perspective");
    throw new Error(`Failed to parse tasks result: ${e}`);
  }
}
