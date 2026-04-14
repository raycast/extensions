import {
  deleteFocusedWorkLog,
  submitTaskForm,
  type DeleteFocusedWorkLogResult,
  type TaskFormRepository,
  type TaskFormValues,
} from "./task-form-submit";
import type { TaskLogStatusBehavior, TaskRecord } from "./types";

interface ConfirmAlertOptions {
  title: string;
  message: string;
  primaryAction: { title: string; style: string };
}

export interface TaskFormController {
  submit(options: {
    task?: TaskRecord;
    values: TaskFormValues;
    newWorkLogEntry: string;
    statusBehavior: TaskLogStatusBehavior;
    onDidSave?: () => Promise<void> | void;
  }): Promise<"missing_header" | "validation_failed" | "saved" | "error">;
  deleteFocusedWorkLog(options: {
    values: TaskFormValues;
    focusedWorkLogId?: string;
  }): Promise<DeleteFocusedWorkLogResult | undefined>;
}

interface TaskFormControllerDependencies {
  repository: TaskFormRepository;
  pop: () => void;
  popToRootImpl: (options: { clearSearchBar: boolean }) => Promise<void>;
  afterSaveImpl?: () => Promise<void> | void;
  showToastImpl: (options: {
    style: "success" | "failure";
    title: string;
    message?: string;
  }) => Promise<unknown>;
  confirmAlertImpl: (options: ConfirmAlertOptions) => Promise<boolean>;
  showTaskMutationFailureToastImpl: (
    error: unknown,
    title: string,
    fallbackMessage: string,
  ) => Promise<unknown>;
}

export function createTaskFormController(
  dependencies: TaskFormControllerDependencies,
): TaskFormController {
  return {
    async submit({ task, values, newWorkLogEntry, statusBehavior, onDidSave }) {
      try {
        const result = await submitTaskForm({
          repository: dependencies.repository,
          task,
          values,
          newWorkLogEntry,
          statusBehavior,
          confirmAlertImpl: dependencies.confirmAlertImpl,
        });

        if (result.result === "missing_header") {
          return "missing_header";
        }

        if (result.result === "validation_failed") {
          await dependencies.showToastImpl({
            style: "failure",
            title: "Unable to save task",
            message: result.message,
          });
          return "validation_failed";
        }

        await dependencies.showToastImpl({
          style: "success",
          title: result.successTitle,
        });

        if (onDidSave) {
          await onDidSave();
        }

        if (dependencies.afterSaveImpl) {
          await dependencies.afterSaveImpl();
        } else {
          try {
            dependencies.pop();
          } catch {
            await dependencies.popToRootImpl({ clearSearchBar: true });
          }
        }

        return "saved";
      } catch (error) {
        await dependencies.showTaskMutationFailureToastImpl(
          error,
          task ? "Unable to update task" : "Unable to create task",
          task ? "Unable to update task." : "Unable to create task.",
        );
        return "error";
      }
    },
    async deleteFocusedWorkLog({ values, focusedWorkLogId }) {
      if (!focusedWorkLogId) {
        return undefined;
      }

      const confirmed = await dependencies.confirmAlertImpl({
        title: "Delete work log?",
        message: "This removes the selected work log from the task.",
        primaryAction: {
          title: "Delete Work Log",
          style: "destructive",
        },
      });

      if (!confirmed) {
        return undefined;
      }

      return deleteFocusedWorkLog(values, focusedWorkLogId);
    },
  };
}

export { deleteFocusedWorkLog, type TaskFormValues } from "./task-form-submit";
