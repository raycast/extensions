import { LocalStorage } from "@raycast/api";
import { Task } from "./parser";
import { TaskSource, TaskGroup } from "./task-source";

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

  async addTask(title: string): Promise<void> {
    const tasks = await loadTasks();
    tasks.push({ pomodoros: 1, title, subtasks: [], done: false });
    await saveTasks(tasks);
  }

  async removeTask(taskTitle: string): Promise<void> {
    const tasks = await loadTasks();
    const filtered = tasks.filter((t) => t.title !== taskTitle);
    await saveTasks(filtered);
  }

  async markDone(taskTitle: string): Promise<void> {
    const tasks = await loadTasks();
    const task = tasks.find((t) => t.title === taskTitle);
    if (task) {
      task.done = true;
      await saveTasks(tasks);
    }
  }

  async markSubtaskDone(
    taskTitle: string,
    subtaskTitle: string,
  ): Promise<void> {
    const tasks = await loadTasks();
    const task = tasks.find((t) => t.title === taskTitle);
    if (task) {
      const sub = task.subtasks.find((s) => s.title === subtaskTitle);
      if (sub) {
        sub.done = true;
        await saveTasks(tasks);
      }
    }
  }
}
