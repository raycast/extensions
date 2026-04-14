import { Alert, Toast, confirmAlert, showToast } from "@raycast/api";
import {
  getRaylogErrorMessage,
  isRaylogCorruptionError,
  type RaylogRepository,
} from "./storage";
import type { TaskRecord } from "./types";

export interface TaskActionOptions {
  task: TaskRecord;
  repository: RaylogRepository;
  onDidMutate?: () => Promise<void> | void;
  onDidDelete?: () => Promise<void> | void;
  confirmAlertImpl?: typeof confirmAlert;
  showToastImpl?: typeof showToast;
}

export async function showTaskMutationFailureToast(
  error: unknown,
  fallbackTitle: string,
  fallbackMessage: string,
  showToastImpl: typeof showToast = showToast,
): Promise<void> {
  await showToastImpl({
    style: Toast.Style.Failure,
    title: isRaylogCorruptionError(error)
      ? "Raylog database is corrupted"
      : fallbackTitle,
    message: getRaylogErrorMessage(error, fallbackMessage),
  });
}

export async function runTaskMutationAction(
  title: string,
  action: () => Promise<unknown>,
  onDidMutate?: () => Promise<void> | void,
  showToastImpl: typeof showToast = showToast,
): Promise<boolean> {
  try {
    await action();
    if (onDidMutate) {
      await onDidMutate();
    }
    await showToastImpl({
      style: Toast.Style.Success,
      title,
    });
    return true;
  } catch (error) {
    await showTaskMutationFailureToast(
      error,
      `Unable to ${title.toLowerCase()}`,
      `Unable to ${title.toLowerCase()}.`,
      showToastImpl,
    );
    return false;
  }
}

export async function completeTaskAction(
  options: TaskActionOptions,
): Promise<boolean> {
  return runTaskMutationAction(
    "Task completed",
    () => options.repository.completeTask(options.task.id),
    options.onDidMutate,
    options.showToastImpl,
  );
}

export async function startTaskAction(
  options: TaskActionOptions,
): Promise<boolean> {
  return runTaskMutationAction(
    "Task started",
    () => options.repository.startTask(options.task.id),
    options.onDidMutate,
    options.showToastImpl,
  );
}

export async function reopenTaskAction(
  options: TaskActionOptions,
): Promise<boolean> {
  return runTaskMutationAction(
    "Task reopened",
    () => options.repository.reopenTask(options.task.id),
    options.onDidMutate,
    options.showToastImpl,
  );
}

export async function archiveTaskAction(
  options: TaskActionOptions,
): Promise<boolean> {
  return runTaskMutationAction(
    "Task archived",
    () => options.repository.archiveTask(options.task.id),
    options.onDidMutate,
    options.showToastImpl,
  );
}

export async function deleteTaskAction(
  options: TaskActionOptions,
): Promise<boolean> {
  const confirmed = await (options.confirmAlertImpl ?? confirmAlert)({
    title: "Delete task?",
    message: "This permanently removes the task from the storage note.",
    primaryAction: {
      title: "Delete Task",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return false;
  }

  return runTaskMutationAction(
    "Task deleted",
    () => options.repository.deleteTask(options.task.id),
    options.onDidDelete ?? options.onDidMutate,
    options.showToastImpl,
  );
}
