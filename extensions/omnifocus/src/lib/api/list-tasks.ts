import { OmniFocusTask } from "../types/task";
import { executeScript } from "../utils/executeScript";
export async function listTasks() {
  return await executeScript<OmniFocusTask[]>(`
const omnifocus = Application("OmniFocus");
const doc = omnifocus.defaultDocument;

const tasks = doc.inboxTasks();

// Planned dates require OmniFocus 4.7+ and a migrated database; the accessor throws otherwise.
// Fall back to null so the rest of the task is still listed.
function safePlannedDate(task) {
  try {
    const value = task.plannedDate ? task.plannedDate() : null;
    return value ? value.toString() : null;
  } catch (e) {
    return null;
  }
}

return tasks.reduce((ts, t) => {
  const completed = t.completed();
  const dropped =  t.dropped();
  if (!completed && !dropped) {
    ts.push({
      id: t.id(),
      name: t.name(),
      flagged: t.flagged(),
      deferDate: t.deferDate() ? t.deferDate().toString() : null,
      plannedDate: safePlannedDate(t),
      dueDate: t.dueDate() ? t.dueDate().toString() : null,
      dropped: t.dropped(),
      completed,
      tags: t.tags ? t.tags().map(tt => tt.name()) : [],
      note: t.note ? t.note() : null
    });
  }
  return ts;
}, []);
`);
}
