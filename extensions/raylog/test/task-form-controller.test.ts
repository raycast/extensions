import test from "node:test";
import assert from "node:assert/strict";
import {
  createTaskFormController,
  type TaskFormValues,
} from "../src/lib/task-form-controller";
import { submitTaskForm } from "../src/lib/task-form-submit";
import type { TaskRecord } from "../src/lib/types";

test("submitTaskForm preserves compatibility by parsing legacy ISO task dates on validation", async () => {
  const result = await submitTaskForm({
    repository: createRepositoryStub(),
    task: createTask(),
    values: createTaskFormValues({
      startDate: new Date("2026-04-02T07:00:00.000Z"),
      dueDate: new Date("2026-04-01T07:00:00.000Z"),
    }),
    newWorkLogEntry: "",
    statusBehavior: "auto_start",
  });

  assert.equal(result.result, "validation_failed");
  assert.equal(result.message, "Start Date cannot be after Due Date");
});

test("controller shows validation toasts without navigating", async () => {
  const toasts: Array<{ title: string; message?: string }> = [];
  const events: string[] = [];
  const controller = createTaskFormController({
    repository: createRepositoryStub(),
    pop: () => {
      events.push("pop");
    },
    popToRootImpl: async () => {
      events.push("pop-to-root");
    },
    showToastImpl: async ({ title, message }) => {
      toasts.push({ title, message });
    },
    confirmAlertImpl: async () => true,
    showTaskMutationFailureToastImpl: async () => undefined,
  });

  const result = await controller.submit({
    task: createTask(),
    values: createTaskFormValues({
      workLogs: [createWorkLog({ body: "   " })],
    }),
    newWorkLogEntry: "",
    statusBehavior: "auto_start",
  });

  assert.equal(result, "validation_failed");
  assert.deepEqual(toasts, [
    {
      title: "Unable to save task",
      message: "Work log entries cannot be empty.",
    },
  ]);
  assert.deepEqual(events, []);
});

test("controller falls back to popToRoot when pop throws", async () => {
  const events: string[] = [];
  const controller = createTaskFormController({
    repository: createRepositoryStub(),
    pop: () => {
      events.push("pop");
      throw new Error("cannot pop");
    },
    popToRootImpl: async () => {
      events.push("pop-to-root");
    },
    showToastImpl: async () => undefined,
    confirmAlertImpl: async () => true,
    showTaskMutationFailureToastImpl: async () => undefined,
  });

  const result = await controller.submit({
    task: createTask(),
    values: createTaskFormValues(),
    newWorkLogEntry: "",
    statusBehavior: "auto_start",
  });

  assert.equal(result, "saved");
  assert.deepEqual(events, ["pop", "pop-to-root"]);
});

test("controller can stay on the current screen after saving", async () => {
  const events: string[] = [];
  const controller = createTaskFormController({
    repository: createRepositoryStub(),
    pop: () => {
      events.push("pop");
    },
    popToRootImpl: async () => {
      events.push("pop-to-root");
    },
    afterSaveImpl: async () => {
      events.push("after-save");
    },
    showToastImpl: async () => undefined,
    confirmAlertImpl: async () => true,
    showTaskMutationFailureToastImpl: async () => undefined,
  });

  const result = await controller.submit({
    values: createTaskFormValues(),
    newWorkLogEntry: "",
    statusBehavior: "auto_start",
  });

  assert.equal(result, "saved");
  assert.deepEqual(events, ["after-save"]);
});

test("controller routes unexpected persistence failures to the mutation error toast", async () => {
  const failures: Array<{ title: string; fallbackMessage: string }> = [];
  const controller = createTaskFormController({
    repository: createRepositoryStub({
      updateTask: async () => {
        throw new Error("boom");
      },
    }),
    pop: () => undefined,
    popToRootImpl: async () => undefined,
    showToastImpl: async () => undefined,
    confirmAlertImpl: async () => true,
    showTaskMutationFailureToastImpl: async (
      _error,
      title,
      fallbackMessage,
    ) => {
      failures.push({ title, fallbackMessage });
    },
  });

  const result = await controller.submit({
    task: createTask(),
    values: createTaskFormValues(),
    newWorkLogEntry: "",
    statusBehavior: "auto_start",
  });

  assert.equal(result, "error");
  assert.deepEqual(failures, [
    {
      title: "Unable to update task",
      fallbackMessage: "Unable to update task.",
    },
  ]);
});

function createRepositoryStub(
  overrides: Partial<{
    updateTask: (taskId: string, values: unknown) => Promise<TaskRecord>;
    createTask: (values: unknown) => Promise<TaskRecord>;
    createWorkLog: (
      taskId: string,
      input: { body: string },
    ) => Promise<TaskRecord["workLogs"][number]>;
    startTask: (taskId: string) => Promise<TaskRecord>;
  }> = {},
) {
  return {
    updateTask: overrides.updateTask ?? (async () => createTask()),
    createTask: overrides.createTask ?? (async () => createTask()),
    createWorkLog:
      overrides.createWorkLog ??
      (async () => ({
        id: "log-2",
        body: "Logged progress",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: null,
      })),
    startTask:
      overrides.startTask ??
      (async () => createTask({ status: "in_progress" })),
  };
}

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: overrides.id ?? "task-id",
    header: overrides.header ?? "Task",
    body: overrides.body ?? "Task body",
    workLogs: overrides.workLogs ?? [],
    status: overrides.status ?? "todo",
    dueDate: overrides.dueDate ?? null,
    startDate: overrides.startDate ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-04-03T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-03T00:00:00.000Z",
  };
}

function createWorkLog(
  overrides: Partial<TaskRecord["workLogs"][number]> = {},
): TaskRecord["workLogs"][number] {
  return {
    id: overrides.id ?? "log-id",
    body: overrides.body ?? "Logged progress",
    createdAt: overrides.createdAt ?? "2026-04-03T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? null,
  };
}

function createTaskFormValues(
  overrides: Partial<TaskFormValues> = {},
): TaskFormValues {
  return {
    header: overrides.header ?? "Task",
    body: overrides.body ?? "Task body",
    status: overrides.status ?? "todo",
    dueDate: overrides.dueDate ?? null,
    startDate: overrides.startDate ?? null,
    workLogs: overrides.workLogs ?? [],
  };
}
