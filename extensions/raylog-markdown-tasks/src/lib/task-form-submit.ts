import { toCanonicalDateString } from "./date";
import { validateTaskInput, validateWorkLogInput } from "./tasks";
import type { TaskLogStatusBehavior, TaskRecord, TaskStatus, TaskWorkLogRecord } from "./types";

export interface TaskFormValues {
  header: string;
  body: string;
  status: TaskStatus;
  dueDate: Date | null;
  startDate: Date | null;
  workLogs: TaskWorkLogRecord[];
}

export interface TaskFormRepository {
  createTask(input: {
    header: string;
    body: string;
    status: TaskStatus;
    dueDate: string | null;
    startDate: string | null;
    workLogs: TaskWorkLogRecord[];
  }): Promise<TaskRecord>;
  updateTask(
    taskId: string,
    input: {
      header: string;
      body: string;
      status: TaskStatus;
      dueDate: string | null;
      startDate: string | null;
      workLogs: TaskWorkLogRecord[];
    },
  ): Promise<TaskRecord>;
  createWorkLog(taskId: string, input: { body: string }): Promise<TaskWorkLogRecord>;
  startTask(taskId: string): Promise<TaskRecord>;
}

export interface SubmitTaskFormOptions {
  repository: TaskFormRepository;
  task?: TaskRecord;
  values: TaskFormValues;
  newWorkLogEntry: string;
  statusBehavior: TaskLogStatusBehavior;
  confirmAlertImpl?: (options: {
    title: string;
    message: string;
    primaryAction: { title: string; style: string };
  }) => Promise<boolean>;
}

export type SubmitTaskFormResult =
  | { result: "missing_header" }
  | { result: "validation_failed"; message: string }
  | { result: "saved"; successTitle: string };

export async function submitTaskForm({
  repository,
  task,
  values,
  newWorkLogEntry,
  statusBehavior,
  confirmAlertImpl,
}: SubmitTaskFormOptions): Promise<SubmitTaskFormResult> {
  const trimmedNewWorkLogEntry = newWorkLogEntry.trim();
  const payload = {
    header: values.header,
    body: values.body,
    status: values.status,
    dueDate: toCanonicalDateString(values.dueDate),
    startDate: toCanonicalDateString(values.startDate),
    workLogs: task ? buildUpdatedWorkLogs(task.workLogs, values.workLogs) : [],
  };

  if (!values.header.trim()) {
    return { result: "missing_header" };
  }

  const emptyWorkLog = values.workLogs.find((workLog) => !workLog.body.trim());
  if (emptyWorkLog) {
    return {
      result: "validation_failed",
      message: "Work log entries cannot be empty.",
    };
  }

  if (trimmedNewWorkLogEntry) {
    const workLogValidationMessage = validateWorkLogInput({
      body: trimmedNewWorkLogEntry,
    });
    if (workLogValidationMessage) {
      return {
        result: "validation_failed",
        message: workLogValidationMessage,
      };
    }
  }

  const validationMessage = validateTaskInput(payload);
  if (validationMessage) {
    return {
      result: "validation_failed",
      message: validationMessage,
    };
  }

  const savedTask = task ? await repository.updateTask(task.id, payload) : await repository.createTask(payload);

  if (trimmedNewWorkLogEntry) {
    await repository.createWorkLog(savedTask.id, {
      body: trimmedNewWorkLogEntry,
    });
    await maybeAdvanceTaskStatus(savedTask.id, payload.status, statusBehavior, repository, confirmAlertImpl);
  }

  return {
    result: "saved",
    successTitle: task ? "Task updated" : "Task created",
  };
}

async function maybeAdvanceTaskStatus(
  taskId: string,
  taskStatus: TaskStatus,
  statusBehavior: TaskLogStatusBehavior,
  repository: TaskFormRepository,
  confirmAlertImpl?: SubmitTaskFormOptions["confirmAlertImpl"],
) {
  if (taskStatus !== "todo") {
    return;
  }

  if (statusBehavior === "keep_status") {
    return;
  }

  if (statusBehavior === "prompt") {
    const confirmed = confirmAlertImpl
      ? await confirmAlertImpl({
          title: "Move task to In Progress?",
          message: "Logging work on a to-do task can also start the task.",
          primaryAction: {
            title: "Start Task",
            style: "default",
          },
        })
      : false;

    if (!confirmed) {
      return;
    }
  }

  await repository.startTask(taskId);
}

function buildUpdatedWorkLogs(
  originalWorkLogs: TaskWorkLogRecord[],
  nextWorkLogs: TaskWorkLogRecord[],
): TaskWorkLogRecord[] {
  const originalWorkLogMap = new Map(originalWorkLogs.map((workLog) => [workLog.id, workLog]));
  const now = new Date().toISOString();

  return nextWorkLogs.map((workLog) => {
    const original = originalWorkLogMap.get(workLog.id);
    if (!original) {
      return workLog;
    }

    if (original.body === workLog.body) {
      return original;
    }

    return {
      ...original,
      body: workLog.body.trim(),
      updatedAt: now,
    };
  });
}

export interface DeleteFocusedWorkLogResult {
  values: TaskFormValues;
  pendingFocusWorkLogId?: string;
}

export function deleteFocusedWorkLog(
  values: TaskFormValues,
  focusedWorkLogId?: string,
): DeleteFocusedWorkLogResult | undefined {
  if (!focusedWorkLogId) {
    return undefined;
  }

  const deletedIndex = values.workLogs.findIndex((workLog) => workLog.id === focusedWorkLogId);

  if (deletedIndex < 0) {
    return undefined;
  }

  const workLogs = values.workLogs.filter((workLog) => workLog.id !== focusedWorkLogId);
  const nextFocusedWorkLog = workLogs[deletedIndex] ?? workLogs[deletedIndex - 1];

  return {
    values: {
      ...values,
      workLogs,
    },
    pendingFocusWorkLogId: nextFocusedWorkLog?.id,
  };
}
