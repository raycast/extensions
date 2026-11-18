import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMenuBarTaskActionSpecs,
  buildTaskDetailActionSpecs,
  buildTaskListActionSpecs,
} from "../src/lib/task-flow";
import { createTaskFormController, deleteFocusedWorkLog, type TaskFormValues } from "../src/lib/task-form-controller";
import { formatTaskDate } from "../src/lib/date";
import type { TaskRecord } from "../src/lib/types";

test("TaskListScreen Enter opens TaskDetailView for the selected task", () => {
  const specs = buildTaskListActionSpecs({
    notePath: "/tmp/raylog-test.md",
    repository: createRepositoryStub(),
    onReload: async () => undefined,
    task: createTask(),
    taskLogStatusBehavior: "auto_start",
  });

  const openTask = specs.find((spec) => spec.title === "Open Task");
  assert.ok(openTask?.kind === "target");
  assert.equal(openTask?.target.type, "TaskDetailView");
  assert.equal(openTask.target.props.taskId, "task-id");
});

test("TaskListScreen Cmd+L opens TaskForm focused on the new log field", () => {
  const specs = buildTaskListActionSpecs({
    notePath: "/tmp/raylog-test.md",
    repository: createRepositoryStub(),
    onReload: async () => undefined,
    task: createTask(),
    taskLogStatusBehavior: "auto_start",
  });

  const logWork = specs.find((spec) => spec.title === "Log Work");
  assert.deepEqual(logWork?.shortcut, { modifiers: ["cmd"], key: "l" });
  assert.ok(logWork?.kind === "target");
  assert.equal(logWork?.target.type, "TaskForm");
  assert.equal(logWork?.target.props.initialFocus, "new_work_log");
});

test("TaskListScreen Cmd+E opens TaskForm for the selected task", () => {
  const specs = buildTaskListActionSpecs({
    notePath: "/tmp/raylog-test.md",
    repository: createRepositoryStub(),
    onReload: async () => undefined,
    task: createTask(),
    taskLogStatusBehavior: "auto_start",
  });

  const editTask = specs.find((spec) => spec.title === "Edit Task");
  assert.deepEqual(editTask?.shortcut, { modifiers: ["cmd"], key: "e" });
  assert.ok(editTask?.kind === "target");
  assert.equal(editTask?.target.type, "TaskForm");
  assert.equal((editTask?.target.props as any).task.id, "task-id");
});

test("TaskListScreen Cmd+N keeps the add form open and resets it after save", () => {
  const specs = buildTaskListActionSpecs({
    notePath: "/tmp/raylog-test.md",
    repository: createRepositoryStub(),
    onReload: async () => undefined,
    task: createTask(),
    taskLogStatusBehavior: "auto_start",
  });

  const addTask = specs.find((spec) => spec.title === "Add Task");
  assert.deepEqual(addTask?.shortcut, { modifiers: ["cmd"], key: "n" });
  assert.ok(addTask?.kind === "target");
  assert.equal(addTask?.target.type, "TaskForm");
  assert.equal(addTask?.target.props.resetOnSave, true);
});

test("TaskDetailView default action opens TaskForm focused on the new log field", () => {
  const specs = buildTaskDetailActionSpecs({
    notePath: "/tmp/raylog-test.md",
    repository: createRepositoryStub(),
    task: createTask(),
    taskLogStatusBehavior: "auto_start",
    onReload: async () => undefined,
    onDidDelete: async () => undefined,
  });

  assert.equal(specs[0]?.title, "Log Work");
  assert.ok(specs[0]?.kind === "target");
  assert.equal(specs[0]?.target.type, "TaskForm");
  assert.equal(specs[0]?.target.props.initialFocus, "new_work_log");
});

test("TaskDetailView Cmd+Shift+C completes the task and reloads in place", async () => {
  const events: string[] = [];
  const specs = buildTaskDetailActionSpecs({
    notePath: "/tmp/raylog-test.md",
    repository: createRepositoryStub({
      completeTask: async (taskId) => {
        events.push(`complete:${taskId}`);
        return createTask({ status: "done" });
      },
    }),
    task: createTask({ status: "in_progress" }),
    taskLogStatusBehavior: "auto_start",
    onReload: async () => {
      events.push("reload");
    },
    onDidDelete: async () => undefined,
  });

  const completeTask = specs.find((spec) => spec.title === "Complete Task");
  assert.ok(completeTask?.kind === "mutation");
  assert.deepEqual(completeTask?.shortcut, {
    modifiers: ["cmd", "shift"],
    key: "c",
  });

  await completeTask?.run();
  assert.deepEqual(events, ["complete:task-id", "reload"]);
});

test("menu bar to-do task exposes start, archive, and open actions", () => {
  const specs = buildMenuBarTaskActionSpecs(createTask({ status: "todo" }));

  assert.deepEqual(
    specs.map((spec) => spec.title),
    ["Start Task", "Archive Task", "Open Task"],
  );
});

test("menu bar in-progress task exposes complete, archive, and open actions", () => {
  const specs = buildMenuBarTaskActionSpecs(createTask({ status: "in_progress" }));

  assert.deepEqual(
    specs.map((spec) => spec.title),
    ["Complete Task", "Archive Task", "Open Task"],
  );
});

test("menu bar done and archived tasks do not expose active lifecycle actions", () => {
  const doneSpecs = buildMenuBarTaskActionSpecs(createTask({ status: "done" }));
  const archivedSpecs = buildMenuBarTaskActionSpecs(createTask({ status: "archived" }));

  assert.deepEqual(
    doneSpecs.map((spec) => spec.title),
    ["Open Task"],
  );
  assert.deepEqual(
    archivedSpecs.map((spec) => spec.title),
    ["Open Task"],
  );
});

test("TaskForm save from log-focused entry triggers parent reload callbacks and returns to the previous screen", async () => {
  const events: string[] = [];
  const controller = createController({
    repository: createRepositoryStub({
      updateTask: async () => createTask(),
      createWorkLog: async () => {
        events.push("create-log");
        return {
          id: "log-2",
          body: "Logged progress",
          createdAt: "2026-04-03T00:00:00.000Z",
          updatedAt: null,
        };
      },
      startTask: async () => {
        events.push("start-task");
        return createTask({ status: "in_progress" });
      },
    }),
    pop: () => {
      events.push("pop");
    },
    popToRootImpl: async () => {
      events.push("pop-to-root");
    },
  });

  const result = await controller.submit({
    task: createTask(),
    values: createTaskFormValues(),
    newWorkLogEntry: "Logged progress",
    statusBehavior: "auto_start",
    onDidSave: async () => {
      events.push("reload");
    },
  });

  assert.equal(result, "saved");
  assert.deepEqual(events, ["create-log", "start-task", "reload", "pop"]);
});

test("TaskForm save returns to the originating screen after editing from List Tasks", async () => {
  const events: string[] = [];
  const controller = createController({
    repository: createRepositoryStub({
      updateTask: async () => createTask(),
    }),
    pop: () => {
      events.push("pop");
    },
    popToRootImpl: async () => {
      events.push("pop-to-root");
    },
  });

  await controller.submit({
    task: createTask(),
    values: createTaskFormValues(),
    newWorkLogEntry: "",
    statusBehavior: "auto_start",
    onDidSave: async () => {
      events.push("list-reload");
    },
  });

  assert.deepEqual(events, ["list-reload", "pop"]);
});

test("TaskForm save returns to TaskDetailView after editing from View Task", async () => {
  const events: string[] = [];
  const controller = createController({
    repository: createRepositoryStub({
      updateTask: async () => createTask(),
    }),
    pop: () => {
      events.push("pop");
    },
    popToRootImpl: async () => {
      events.push("pop-to-root");
    },
  });

  await controller.submit({
    task: createTask(),
    values: createTaskFormValues(),
    newWorkLogEntry: "",
    statusBehavior: "auto_start",
    onDidSave: async () => {
      events.push("detail-reload");
    },
  });

  assert.deepEqual(events, ["detail-reload", "pop"]);
});

test("TaskForm preserves the exact due and start timestamps on save", async () => {
  let savedPayload:
    | {
        dueDate?: string | null;
        startDate?: string | null;
      }
    | undefined;

  const controller = createController({
    repository: createRepositoryStub({
      updateTask: async (_taskId, values) => {
        savedPayload = values as {
          dueDate?: string | null;
          startDate?: string | null;
        };
        return createTask();
      },
    }),
  });

  await controller.submit({
    task: createTask(),
    values: createTaskFormValues({
      dueDate: new Date("2026-04-10T15:45:00.000Z"),
      startDate: new Date("2026-04-09T08:30:00.000Z"),
    }),
    newWorkLogEntry: "",
    statusBehavior: "auto_start",
  });

  assert.equal(savedPayload?.dueDate, "2026-04-10");
  assert.equal(savedPayload?.startDate, "2026-04-09");
});

test("formatTaskDate includes time when a timestamp is present", () => {
  const localTimedValue = new Date(2026, 3, 10, 15, 45, 0, 0).toISOString();
  const localMidnightValue = new Date(2026, 3, 10, 0, 0, 0, 0).toISOString();

  assert.equal(formatTaskDate(localTimedValue), "Apr 10, 2026 3:45 PM");
  assert.equal(formatTaskDate(localMidnightValue), "Apr 10, 2026");
});

test("deleteFocusedWorkLog removes the focused work log and selects the next entry", () => {
  const result = deleteFocusedWorkLog(
    createTaskFormValues({
      workLogs: [createWorkLog({ id: "a" }), createWorkLog({ id: "b" }), createWorkLog({ id: "c" })],
    }),
    "b",
  );

  assert.deepEqual(
    result?.values.workLogs.map((workLog) => workLog.id),
    ["a", "c"],
  );
  assert.equal(result?.pendingFocusWorkLogId, "c");
});

function createRepositoryStub(
  overrides: Partial<{
    completeTask: (taskId: string) => Promise<TaskRecord>;
    updateTask: (taskId: string, values: unknown) => Promise<TaskRecord>;
    createTask: (values: unknown) => Promise<TaskRecord>;
    createWorkLog: (taskId: string, input: { body: string }) => Promise<TaskRecord["workLogs"][number]>;
    startTask: (taskId: string) => Promise<TaskRecord>;
    reopenTask: (taskId: string) => Promise<TaskRecord>;
    archiveTask: (taskId: string) => Promise<TaskRecord>;
    deleteTask: (taskId: string) => Promise<void>;
  }> = {},
) {
  return {
    completeTask: overrides.completeTask ?? (async () => createTask({ status: "done" })),
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
    startTask: overrides.startTask ?? (async () => createTask({ status: "in_progress" })),
    reopenTask: overrides.reopenTask ?? (async () => createTask()),
    archiveTask: overrides.archiveTask ?? (async () => createTask({ status: "archived" })),
    deleteTask: overrides.deleteTask ?? (async () => undefined),
  } as never;
}

function createController(overrides: Partial<Parameters<typeof createTaskFormController>[0]> = {}) {
  return createTaskFormController({
    repository: createRepositoryStub(),
    pop: () => undefined,
    popToRootImpl: async () => undefined,
    showToastImpl: async () => undefined,
    confirmAlertImpl: async () => true,
    showTaskMutationFailureToastImpl: async () => undefined,
    ...overrides,
  });
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

function createWorkLog(overrides: Partial<TaskRecord["workLogs"][number]> = {}): TaskRecord["workLogs"][number] {
  return {
    id: overrides.id ?? "log-id",
    body: overrides.body ?? "Logged progress",
    createdAt: overrides.createdAt ?? "2026-04-03T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? null,
  };
}

function createTaskFormValues(overrides: Partial<TaskFormValues> = {}): TaskFormValues {
  return {
    header: overrides.header ?? "Task",
    body: overrides.body ?? "Task body",
    status: overrides.status ?? "todo",
    dueDate: overrides.dueDate ?? null,
    startDate: overrides.startDate ?? null,
    workLogs: overrides.workLogs ?? [],
  };
}
