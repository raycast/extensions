import { getRaylogErrorMessage } from "./storage";
import type { TaskRecord } from "./types";

export type MenuBarTaskAction = "complete" | "start" | "archive";

export interface MenuBarTaskActionRepository {
  completeTask(taskId: string): Promise<unknown>;
  startTask(taskId: string): Promise<unknown>;
  archiveTask(taskId: string): Promise<unknown>;
}

export async function executeMenuBarTaskAction(options: {
  action: MenuBarTaskAction;
  task: TaskRecord;
  repository: MenuBarTaskActionRepository;
  loadMenuBarTasks: () => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
  showToast: (options: {
    style: "success" | "failure";
    title: string;
    message?: string;
  }) => Promise<unknown>;
}): Promise<void> {
  const actionHandlers = {
    complete: async () => options.repository.completeTask(options.task.id),
    start: async () => options.repository.startTask(options.task.id),
    archive: async () => options.repository.archiveTask(options.task.id),
  } as const;

  const successTitles = {
    complete: "Task completed",
    start: "Task started",
    archive: "Task archived",
  } as const;

  const failureTitles = {
    complete: "Unable to complete task",
    start: "Unable to start task",
    archive: "Unable to archive task",
  } as const;

  options.setIsLoading(true);

  try {
    await actionHandlers[options.action]();
    await options.showToast({
      style: "success",
      title: successTitles[options.action],
    });
    await options.loadMenuBarTasks();
  } catch (error) {
    options.setIsLoading(false);
    await options.showToast({
      style: "failure",
      title: failureTitles[options.action],
      message: getRaylogErrorMessage(
        error,
        `${failureTitles[options.action]}.`,
      ),
    });
  }
}
