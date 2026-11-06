import { LocalStorage } from "@raycast/api";
import { Task } from "./parser";
import { TaskSource, TaskGroup, EditResult } from "./task-source";
import { withSessionLock } from "./lock";

const TASKS_KEY = "pomodoro-md-tasks";

async function loadTasks(): Promise<Task[]> {
  const raw = await LocalStorage.getItem<string>(TASKS_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

async function saveTasks(tasks: Task[]): Promise<void> {
  await LocalStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export class ManualTaskSource implements TaskSource {
  async getTasks(): Promise<TaskGroup[]> {
    const tasks = await loadTasks();
    return [{ name: "Tasks", tasks }];
  }

  async addTask(title: string): Promise<EditResult> {
    return this.edit((tasks) => {
      tasks.push({ pomodoros: 1, title, subtasks: [], done: false });
      return true;
    });
  }

  async removeTask(taskTitle: string): Promise<EditResult> {
    return this.edit((tasks) => {
      const idx = tasks.findIndex((t) => t.title === taskTitle);
      if (idx === -1) return false;
      tasks.splice(idx, 1);
      return true;
    });
  }

  async markDone(taskTitle: string): Promise<EditResult> {
    return this.edit((tasks) => {
      const task = tasks.find((t) => t.title === taskTitle);
      if (!task) return false;
      task.done = true;
      return true;
    });
  }

  async markSubtaskDone(
    taskTitle: string,
    subtaskTitle: string,
  ): Promise<EditResult> {
    return this.edit((tasks) => {
      const sub = tasks
        .find((t) => t.title === taskTitle)
        ?.subtasks.find((s) => s.title === subtaskTitle);
      if (!sub) return false;
      sub.done = true;
      return true;
    });
  }

  /**
   * Load the list, let `edit` change it, and save it back if it did. The
   * read-modify-write runs under the session lock so two quick actions
   * cannot overwrite each other's change.
   */
  private async edit(edit: (tasks: Task[]) => boolean): Promise<EditResult> {
    const result = await withSessionLock(async () => {
      const tasks = await loadTasks();
      if (edit(tasks)) await saveTasks(tasks);
    });
    if (result.acquired) return { status: "ok" };
    return result.reason === "busy"
      ? { status: "busy" }
      : { status: "error", error: result.error };
  }
}
