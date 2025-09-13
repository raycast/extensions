import { LocalStorage } from "@raycast/api";

export interface TaskRecord {
  id: string;
  taskId: string;
  fileName: string;
  stemType: string;
  status: "pending" | "processing" | "complete" | "error" | "cancelled";
  submittedAt: string;
  completedAt?: string;
  resultUrls?: {
    stemTrack?: string;
    backTrack?: string;
  };
  error?: string;
}

export class TaskHistory {
  private readonly STORAGE_KEY = "lalal-ai-tasks";
  private readonly MAX_TASKS = 10;

  async getTasks(): Promise<TaskRecord[]> {
    try {
      const stored = await LocalStorage.getItem<string>(this.STORAGE_KEY);
      if (!stored) return [];

      const tasks = JSON.parse(stored) as TaskRecord[];
      return tasks.sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
    } catch (error) {
      console.error("Failed to load task history:", error);
      return [];
    }
  }

  async addTask(task: TaskRecord): Promise<void> {
    try {
      const tasks = await this.getTasks();

      // Remove existing task with same ID if it exists
      const filteredTasks = tasks.filter((t) => t.id !== task.id);

      // Add new task at the beginning
      const updatedTasks = [task, ...filteredTasks].slice(0, this.MAX_TASKS);

      await LocalStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(updatedTasks),
      );
    } catch (error) {
      console.error("Failed to save task:", error);
    }
  }

  async updateTask(id: string, updates: Partial<TaskRecord>): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const taskIndex = tasks.findIndex((t) => t.id === id);

      if (taskIndex !== -1) {
        tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
        await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  }

  async removeTask(id: string): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const filteredTasks = tasks.filter((t) => t.id !== id);
      await LocalStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(filteredTasks),
      );
    } catch (error) {
      console.error("Failed to remove task:", error);
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await LocalStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  }
}
