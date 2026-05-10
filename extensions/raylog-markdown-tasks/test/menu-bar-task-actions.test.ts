import test from "node:test";
import assert from "node:assert/strict";
import { executeMenuBarTaskAction } from "../src/lib/menu-bar-task-actions";
import type { TaskRecord } from "../src/lib/types";

test("completing a menu bar task refreshes menu state after the mutation", async () => {
  const calls: string[] = [];

  await executeMenuBarTaskAction({
    action: "complete",
    task: createTask({ id: "current-task" }),
    repository: {
      completeTask: async (taskId) => {
        calls.push(`complete:${taskId}`);
      },
      startTask: async () => {
        throw new Error("unexpected");
      },
      archiveTask: async () => {
        throw new Error("unexpected");
      },
    },
    loadMenuBarTasks: async () => {
      calls.push("refresh");
    },
    setIsLoading: (isLoading) => {
      calls.push(`loading:${isLoading}`);
    },
    showToast: async ({ style, title }) => {
      calls.push(`toast:${style}:${title}`);
    },
  });

  assert.deepEqual(calls, ["loading:true", "complete:current-task", "toast:success:Task completed", "refresh"]);
});

test("failed menu bar task actions stop loading and surface an error toast", async () => {
  const calls: string[] = [];

  await executeMenuBarTaskAction({
    action: "complete",
    task: createTask({ id: "current-task" }),
    repository: {
      completeTask: async () => {
        throw new Error("boom");
      },
      startTask: async () => {
        throw new Error("unexpected");
      },
      archiveTask: async () => {
        throw new Error("unexpected");
      },
    },
    loadMenuBarTasks: async () => {
      calls.push("refresh");
    },
    setIsLoading: (isLoading) => {
      calls.push(`loading:${isLoading}`);
    },
    showToast: async ({ style, title, message }) => {
      calls.push(`toast:${style}:${title}:${message}`);
    },
  });

  assert.deepEqual(calls, ["loading:true", "loading:false", "toast:failure:Unable to complete task:boom"]);
});

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-id",
    header: "Task",
    body: "",
    workLogs: [],
    status: "todo",
    dueDate: null,
    startDate: null,
    completedAt: null,
    createdAt: "2026-04-03T00:00:00.000Z",
    updatedAt: "2026-04-03T00:00:00.000Z",
    ...overrides,
  };
}
