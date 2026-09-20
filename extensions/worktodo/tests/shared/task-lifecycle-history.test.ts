import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELAYED_COMPLETION_POLICY,
  IMMEDIATE_COMPLETION_POLICY,
  TaskLifecycleInteraction,
  type TaskLifecycleHistoryState,
} from "../../src/shared/application/task-lifecycle-interaction";
import { openWorktodoAtPath } from "../../src/shared/application/worktodo";
import { TaskService, type TaskLifecycleOperation } from "../../src/shared/domain/task-service";
import { SqliteTaskRepository } from "../../src/shared/storage/sqlite-task-repository";
import { openWorktodoDatabase } from "../../src/shared/storage/database";

const cleanups: Array<() => Promise<void>> = [];

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "worktodo-history-test-"));
  const databasePath = join(directory, "tasks.sqlite");
  const first = openWorktodoAtPath(databasePath);
  const second = openWorktodoAtPath(databasePath);
  const refreshView = vi.fn();
  const refreshRelated = vi.fn();
  const interaction = new TaskLifecycleInteraction({
    mutations: first.service,
    policy: DELAYED_COMPLETION_POLICY,
    refresh: { refreshView, refreshRelated },
  });
  cleanups.push(async () => {
    interaction.dispose();
    first.close();
    second.close();
    await rm(directory, { recursive: true, force: true });
  });
  const task = first.service.createTask({ title: "Shared task" });
  return { first, second, interaction, task, refreshView, refreshRelated, databasePath };
}

function history(interaction: TaskLifecycleInteraction): TaskLifecycleHistoryState {
  const state = interaction.historyState;
  if (!state) throw new Error("Expected lifecycle history");
  return state;
}

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("guarded lifecycle history", () => {
  it.each(["complete", "trash"] as const)("rejects stale %s Undo after another session reverses it", async (kind) => {
    const { first, second, interaction, task, refreshView, refreshRelated } = await setup();
    interaction.runMutation(kind, task.id);
    const undo = history(interaction);
    if (kind === "complete") second.service.reopenTask(task.id);
    else second.service.restoreTask(task.id);
    const externallyChanged = second.service.getTask(task.id);
    refreshView.mockClear();
    refreshRelated.mockClear();

    expect(interaction.runHistory(undo)).toEqual({ status: "unavailable", history: undo });
    expect(interaction.historyState).toBeNull();
    expect(interaction.acknowledgedTasks.size).toBe(0);
    expect(first.service.getTask(task.id)).toEqual(externallyChanged);
    expect(refreshView).toHaveBeenCalledOnce();
    expect(refreshRelated).toHaveBeenCalledOnce();
    expect(interaction.runHistory(undo).status).toBe("unavailable");
  });

  it.each(["complete", "trash"] as const)("rejects stale %s Redo after another session reapplies it", async (kind) => {
    const { first, second, interaction, task } = await setup();
    interaction.runMutation(kind, task.id);
    interaction.runHistory(history(interaction));
    const redo = history(interaction);
    if (kind === "complete") second.service.completeTask(task.id);
    else second.service.trashTask(task.id);
    const externallyChanged = second.service.getTask(task.id);
    expect(interaction.runHistory(redo).status).toBe("unavailable");
    expect(interaction.historyState).toBeNull();
    expect(first.service.getTask(task.id)).toEqual(externallyChanged);
  });

  it.each(["title", "notes"] as const)("invalidates history after an external %s edit", async (field) => {
    const { first, second, interaction, task } = await setup();
    interaction.runMutation("complete", task.id);
    const undo = history(interaction);
    second.service.updateTask(task.id, { [field]: "Changed elsewhere" });
    const edited = second.service.getTask(task.id);
    expect(interaction.runHistory(undo).status).toBe("unavailable");
    expect(first.service.getTask(task.id)).toEqual(edited);
  });

  it("rejects a revision even when another session changes the lifecycle away and back", async () => {
    const { first, second, interaction, task } = await setup();
    interaction.runMutation("complete", task.id);
    interaction.runHistory(history(interaction));
    const redo = history(interaction);
    second.service.completeTask(task.id);
    second.service.reopenTask(task.id);
    const changed = second.service.getTask(task.id);
    expect(changed.completedAtMs).toBe(redo.revision.completedAtMs);
    expect(interaction.runHistory(redo).status).toBe("unavailable");
    expect(first.service.getTask(task.id)).toEqual(changed);
  });

  it("keeps valid history after editing another task and rejects an old toast after a full cycle", async () => {
    const { second, interaction, task } = await setup();
    const other = second.service.createTask({ title: "Other task" });
    interaction.runMutation("complete", task.id);
    const originalUndo = history(interaction);
    second.service.updateTask(other.id, { notes: "Unrelated edit" });
    expect(interaction.runHistory(originalUndo).status).toBe("succeeded");
    expect(interaction.runHistory(history(interaction)).status).toBe("succeeded");
    const currentUndo = history(interaction);
    expect(interaction.runHistory(originalUndo).status).toBe("unavailable");
    expect(interaction.historyState).toEqual(currentUndo);
    expect(interaction.runHistory(currentUndo).status).toBe("succeeded");
  });

  it.each(["complete", "reopen", "trash", "restore"] as const)(
    "rejects a no-op %s even with a matching revision",
    async (operation) => {
      const { first, task } = await setup();
      if (operation === "complete") first.service.completeTask(task.id);
      if (operation === "trash") first.service.trashTask(task.id);
      const before = first.service.getTask(task.id);
      expect(first.service.applyTaskLifecycleHistory(task.id, operation, before)).toEqual({ status: "stale" });
      expect(first.service.getTask(task.id)).toEqual(before);
    },
  );

  it("rejects missing tasks and completion history for a trashed task", async () => {
    const { first, task } = await setup();
    expect(first.service.applyTaskLifecycleHistory("00000000-0000-4000-8000-000000000001", "complete", task)).toEqual({
      status: "stale",
    });
    const trashed = first.service.trashTask(task.id);
    expect(first.service.applyTaskLifecycleHistory(task.id, "complete", trashed)).toEqual({ status: "stale" });
    expect(first.service.getTask(task.id)).toEqual(trashed);
  });

  it("checks and writes within one transaction that excludes a competing SQLite writer", async () => {
    const { first, task, databasePath } = await setup();
    const db = openWorktodoDatabase(databasePath);
    const competitor = openWorktodoDatabase(databasePath);
    competitor.exec("PRAGMA busy_timeout = 0");
    try {
      const repository = new SqliteTaskRepository(db);
      const getTask = repository.getTask.bind(repository);
      const updateTask = repository.updateTask.bind(repository);
      vi.spyOn(repository, "getTask").mockImplementation((id) => {
        expect(db.isTransaction).toBe(true);
        expect(() => competitor.exec("BEGIN IMMEDIATE")).toThrow(/locked/);
        return getTask(id);
      });
      vi.spyOn(repository, "updateTask").mockImplementation((value) => {
        expect(db.isTransaction).toBe(true);
        updateTask(value);
      });
      const transaction = vi.spyOn(repository, "transaction");
      const service = new TaskService(repository, { now: Date.now, createId: () => task.id });
      const operation: TaskLifecycleOperation = "complete";
      expect(service.applyTaskLifecycleHistory(task.id, operation, task).status).toBe("applied");
      expect(transaction).toHaveBeenCalledOnce();
      expect(repository.updateTask).toHaveBeenCalledOnce();
      expect(db.isTransaction).toBe(false);
      expect(first.service.getTask(task.id).completedAtMs).not.toBeNull();
      competitor.exec("BEGIN IMMEDIATE");
      competitor.exec("ROLLBACK");
    } finally {
      db.close();
      competitor.close();
    }
  });

  it("preserves retryable history after a failed guarded write", async () => {
    const { first, interaction, task } = await setup();
    interaction.runMutation("complete", task.id);
    const undo = history(interaction);
    vi.spyOn(first.service, "applyTaskLifecycleHistory").mockImplementationOnce(() => {
      throw new Error("database locked");
    });
    expect(interaction.runHistory(undo)).toMatchObject({ status: "failed" });
    expect(interaction.historyState).toEqual(undo);
    expect(interaction.runHistory(undo).status).toBe("succeeded");
  });

  it("rolls back a guarded transition if persistence throws after writing", async () => {
    const { first, task, databasePath } = await setup();
    const db = openWorktodoDatabase(databasePath);
    try {
      const repository = new SqliteTaskRepository(db);
      const updateTask = repository.updateTask.bind(repository);
      vi.spyOn(repository, "updateTask").mockImplementation((value) => {
        updateTask(value);
        throw new Error("write failed");
      });
      const service = new TaskService(repository, { now: Date.now, createId: () => task.id });
      expect(() => service.applyTaskLifecycleHistory(task.id, "complete", task)).toThrow("write failed");
      expect(db.isTransaction).toBe(false);
      expect(first.service.getTask(task.id)).toEqual(task);
    } finally {
      db.close();
    }
  });

  it("also invalidates menu-bar history under the immediate policy", async () => {
    const { first, second, task } = await setup();
    const interaction = new TaskLifecycleInteraction({
      mutations: first.service,
      policy: IMMEDIATE_COMPLETION_POLICY,
      refresh: { refreshView: vi.fn() },
    });
    try {
      interaction.runMutation("trash", task.id);
      second.service.restoreTask(task.id);
      expect(interaction.runHistory(history(interaction)).status).toBe("unavailable");
      expect(interaction.historyState).toBeNull();
    } finally {
      interaction.dispose();
    }
  });
});
