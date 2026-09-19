import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOperationScopedTaskLifecycleMutations,
  DELAYED_COMPLETION_POLICY,
  IMMEDIATE_COMPLETION_POLICY,
  TASK_COMPLETION_ACKNOWLEDGEMENT_DURATION_MS,
  TASK_LIFECYCLE_HISTORY_DURATION_MS,
  TaskLifecycleInteraction,
  type TaskLifecycleMutations,
  type TaskLifecyclePolicy,
} from "../../src/shared/application/task-lifecycle-interaction";
import type { Task } from "../../src/shared/domain/model";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Review lifecycle interaction",
    notes: "",
    priority: true,
    position: 1_024,
    projectId: null,
    sectionId: null,
    due: { kind: "none" },
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
    completedAtMs: null,
    trashedAtMs: null,
    ...overrides,
  };
}

function mutableTaskMutations(initial = task()) {
  let stored = initial;
  const mutations: TaskLifecycleMutations = {
    completeTask: vi.fn(() => {
      stored = { ...stored, completedAtMs: 2_000, updatedAtMs: 2_000 };
      return stored;
    }),
    reopenTask: vi.fn(() => {
      stored = { ...stored, completedAtMs: null, updatedAtMs: 3_000 };
      return stored;
    }),
    trashTask: vi.fn(() => {
      stored = { ...stored, trashedAtMs: 4_000, updatedAtMs: 4_000 };
      return stored;
    }),
    restoreTask: vi.fn(() => {
      stored = { ...stored, trashedAtMs: null, updatedAtMs: 5_000 };
      return stored;
    }),
  };
  return { mutations, getTask: () => stored };
}

function createInteraction(policy: TaskLifecyclePolicy, mutations: TaskLifecycleMutations, events: string[] = []) {
  const acknowledgements: number[] = [];
  const history: Array<string | null> = [];
  const interaction = new TaskLifecycleInteraction({
    mutations,
    policy,
    refresh: {
      refreshView: () => events.push("view refreshed"),
      refreshRelated: () => events.push("related refreshed"),
    },
    onAcknowledgementsChanged: (tasks) => {
      acknowledgements.push(tasks.size);
      events.push(tasks.size === 0 ? "acknowledgement cleared" : "acknowledged");
    },
    onHistoryChanged: (state) => {
      history.push(state?.direction ?? null);
      events.push(state ? `${state.direction} recorded` : "history cleared");
    },
  });
  return { interaction, acknowledgements, history };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("task lifecycle interaction", () => {
  it("persists, acknowledges, suppresses duplicates, and refreshes after one second", () => {
    vi.useFakeTimers();
    const events: string[] = [];
    const source = mutableTaskMutations();
    vi.mocked(source.mutations.completeTask).mockImplementation((taskId) => {
      events.push("persisted");
      return { ...source.getTask(), id: taskId, completedAtMs: 2_000 };
    });
    const { interaction, acknowledgements } = createInteraction(DELAYED_COMPLETION_POLICY, source.mutations, events);

    const completed = interaction.runMutation("complete", source.getTask().id);
    const duplicate = interaction.runMutation("complete", source.getTask().id);

    expect(completed).toMatchObject({
      status: "succeeded",
      operation: "complete",
      history: { direction: "undo", kind: "complete" },
      refresh: { view: "afterAcknowledgement", related: "immediate" },
    });
    expect(duplicate).toMatchObject({ status: "duplicate" });
    expect(source.mutations.completeTask).toHaveBeenCalledOnce();
    expect(events).toEqual(["persisted", "acknowledged", "related refreshed", "undo recorded"]);

    vi.advanceTimersByTime(TASK_COMPLETION_ACKNOWLEDGEMENT_DURATION_MS);
    expect(acknowledgements).toEqual([1, 0]);
    expect(events.slice(-2)).toEqual(["acknowledgement cleared", "view refreshed"]);
  });

  it("runs completion Undo and Redo with the delayed policy", () => {
    vi.useFakeTimers();
    const source = mutableTaskMutations();
    const { interaction } = createInteraction(DELAYED_COMPLETION_POLICY, source.mutations);
    const completed = interaction.runMutation("complete", source.getTask().id);
    if (completed.status !== "succeeded" || !completed.history) {
      throw new Error("Expected completed lifecycle action");
    }

    const undone = interaction.runHistory(completed.history);
    expect(undone).toMatchObject({
      status: "succeeded",
      operation: "reopen",
      history: { direction: "redo", kind: "complete" },
      refresh: { view: "immediate" },
    });
    expect(source.getTask().completedAtMs).toBeNull();
    expect(interaction.acknowledgedTasks.size).toBe(0);
    if (undone.status !== "succeeded" || !undone.history) {
      throw new Error("Expected undone lifecycle action");
    }

    const redone = interaction.runHistory(undone.history);
    expect(redone).toMatchObject({
      status: "succeeded",
      operation: "complete",
      history: { direction: "undo", kind: "complete" },
      refresh: { view: "afterAcknowledgement" },
    });
    expect(source.getTask().completedAtMs).toBe(2_000);
    expect(interaction.acknowledgedTasks.size).toBe(1);
    expect(source.mutations.completeTask).toHaveBeenCalledTimes(2);
    expect(source.mutations.reopenTask).toHaveBeenCalledOnce();
  });

  it("clears delayed acknowledgement without running its stale refresh", () => {
    vi.useFakeTimers();
    const source = mutableTaskMutations();
    const viewRefresh = vi.fn();
    const acknowledgements: number[] = [];
    const interaction = new TaskLifecycleInteraction({
      mutations: source.mutations,
      policy: DELAYED_COMPLETION_POLICY,
      refresh: { refreshView: viewRefresh, refreshRelated: vi.fn() },
      onAcknowledgementsChanged: (tasks) => acknowledgements.push(tasks.size),
    });
    interaction.runMutation("complete", source.getTask().id);

    interaction.clearAcknowledgements();
    vi.runAllTimers();

    expect(acknowledgements).toEqual([1, 0]);
    expect(viewRefresh).not.toHaveBeenCalled();
  });

  it("runs trash Undo and Redo and supports direct reopen and restore", () => {
    vi.useFakeTimers();
    const source = mutableTaskMutations();
    const { interaction } = createInteraction(IMMEDIATE_COMPLETION_POLICY, source.mutations);
    const trashed = interaction.runMutation("trash", source.getTask().id);
    if (trashed.status !== "succeeded" || !trashed.history) {
      throw new Error("Expected trashed lifecycle action");
    }
    expect(source.getTask().trashedAtMs).toBe(4_000);

    const restored = interaction.runHistory(trashed.history);
    expect(restored).toMatchObject({ status: "succeeded", operation: "restore", history: { direction: "redo" } });
    expect(source.getTask().trashedAtMs).toBeNull();
    if (restored.status !== "succeeded" || !restored.history) {
      throw new Error("Expected restored lifecycle action");
    }

    expect(interaction.runHistory(restored.history)).toMatchObject({
      status: "succeeded",
      operation: "trash",
      history: { direction: "undo" },
    });
    expect(interaction.runMutation("restore", source.getTask().id)).toMatchObject({
      status: "succeeded",
      operation: "restore",
      history: null,
    });
    expect(interaction.historyState).toBeNull();

    interaction.runMutation("complete", source.getTask().id);
    expect(interaction.runMutation("reopen", source.getTask().id)).toMatchObject({
      status: "succeeded",
      operation: "reopen",
      history: null,
    });
    expect(interaction.historyState).toBeNull();
  });

  it("protects replaced and expired history and clears external mutation state", () => {
    vi.useFakeTimers();
    const source = mutableTaskMutations();
    const events: string[] = [];
    const { interaction } = createInteraction(IMMEDIATE_COMPLETION_POLICY, source.mutations, events);
    const first = interaction.runMutation("complete", source.getTask().id);
    if (first.status !== "succeeded" || !first.history) {
      throw new Error("Expected first lifecycle action");
    }
    const stale = first.history;
    interaction.runMutation("trash", source.getTask().id);

    expect(interaction.runHistory(stale)).toEqual({ status: "unavailable", history: stale });
    expect(source.mutations.reopenTask).not.toHaveBeenCalled();
    vi.advanceTimersByTime(TASK_LIFECYCLE_HISTORY_DURATION_MS);
    expect(interaction.historyState).toBeNull();
    expect(interaction.runHistory(stale)).toEqual({ status: "unavailable", history: stale });

    interaction.runMutation("complete", source.getTask().id);
    interaction.refreshAfterExternalMutation();
    expect(interaction.historyState).toBeNull();
    expect(events.slice(-3)).toEqual(["history cleared", "view refreshed", "related refreshed"]);
  });

  it("keeps state and refreshes unchanged when persistence fails", () => {
    vi.useFakeTimers();
    const source = mutableTaskMutations();
    const events: string[] = [];
    vi.mocked(source.mutations.completeTask).mockImplementationOnce(() => {
      throw new Error("database busy");
    });
    const { interaction } = createInteraction(DELAYED_COMPLETION_POLICY, source.mutations, events);

    expect(interaction.runMutation("complete", source.getTask().id)).toMatchObject({
      status: "failed",
      operation: "complete",
      error: new Error("database busy"),
    });
    expect(interaction.historyState).toBeNull();
    expect(interaction.acknowledgedTasks.size).toBe(0);
    expect(events).toEqual([]);

    const completed = interaction.runMutation("complete", source.getTask().id);
    if (completed.status !== "succeeded" || !completed.history) {
      throw new Error("Expected completed lifecycle action");
    }
    vi.mocked(source.mutations.reopenTask).mockImplementationOnce(() => {
      throw new Error("database locked");
    });
    expect(interaction.runHistory(completed.history)).toMatchObject({
      status: "failed",
      operation: "reopen",
      error: new Error("database locked"),
    });
    expect(interaction.historyState).toEqual(completed.history);

    const undone = interaction.runHistory(completed.history);
    if (undone.status !== "succeeded") {
      throw new Error("Expected successful completion Undo");
    }
    vi.mocked(source.mutations.completeTask).mockImplementationOnce(() => {
      throw new Error("database read-only");
    });
    expect(interaction.runHistory(undone.history)).toMatchObject({
      status: "failed",
      operation: "complete",
      error: new Error("database read-only"),
    });
    expect(interaction.historyState).toEqual(undone.history);
  });

  it("refreshes immediately without acknowledgement under the menu-bar policy", () => {
    vi.useFakeTimers();
    const source = mutableTaskMutations();
    const viewRefresh = vi.fn();
    const acknowledgements = vi.fn();
    const interaction = new TaskLifecycleInteraction({
      mutations: source.mutations,
      policy: IMMEDIATE_COMPLETION_POLICY,
      refresh: { refreshView: viewRefresh },
      onAcknowledgementsChanged: acknowledgements,
    });

    expect(interaction.runMutation("complete", source.getTask().id)).toMatchObject({
      status: "succeeded",
      refresh: { view: "immediate", related: "none" },
    });
    expect(viewRefresh).toHaveBeenCalledOnce();
    expect(acknowledgements).not.toHaveBeenCalled();
    expect(interaction.acknowledgedTasks.size).toBe(0);
  });

  it("closes every operation-scoped session after success or failure", () => {
    const source = mutableTaskMutations();
    let closeCount = 0;
    const mutations = createOperationScopedTaskLifecycleMutations(() => ({
      service: source.mutations,
      close: () => {
        closeCount += 1;
      },
    }));

    expect(mutations.completeTask(source.getTask().id)).toMatchObject({ completedAtMs: 2_000 });
    vi.mocked(source.mutations.restoreTask).mockImplementationOnce(() => {
      throw new Error("restore failed");
    });
    expect(() => mutations.restoreTask(source.getTask().id)).toThrow("restore failed");
    expect(closeCount).toBe(2);
  });

  it("does not reclassify or repeat a committed mutation when success feedback rejects", async () => {
    const source = mutableTaskMutations();
    const { interaction } = createInteraction(IMMEDIATE_COMPLETION_POLICY, source.mutations);
    const result = interaction.runMutation("complete", source.getTask().id);
    const showSuccessFeedback = vi.fn().mockRejectedValue(new Error("Toast unavailable"));
    const reportMutationFailure = vi.fn();

    const present = async () => {
      if (result.status === "failed") {
        await reportMutationFailure(result.error);
      } else if (result.status === "succeeded") {
        await showSuccessFeedback(result);
      }
    };

    await expect(present()).rejects.toThrow("Toast unavailable");
    expect(source.mutations.completeTask).toHaveBeenCalledOnce();
    expect(reportMutationFailure).not.toHaveBeenCalled();
    expect(interaction.historyState).toMatchObject({ direction: "undo", kind: "complete" });
  });

  it("disposes timers without publishing another state change", () => {
    const source = mutableTaskMutations();
    const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
    const cancelled: unknown[] = [];
    const acknowledgements: number[] = [];
    const history: Array<string | null> = [];
    const interaction = new TaskLifecycleInteraction({
      mutations: source.mutations,
      policy: DELAYED_COMPLETION_POLICY,
      refresh: { refreshView: vi.fn(), refreshRelated: vi.fn() },
      scheduler: {
        schedule: (callback, delayMs) => {
          const handle = { callback, delayMs };
          scheduled.push(handle);
          return handle;
        },
        cancel: (handle) => cancelled.push(handle),
      },
      onAcknowledgementsChanged: (tasks) => acknowledgements.push(tasks.size),
      onHistoryChanged: (state) => history.push(state?.direction ?? null),
    });
    interaction.runMutation("complete", source.getTask().id);

    expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([
      TASK_COMPLETION_ACKNOWLEDGEMENT_DURATION_MS,
      TASK_LIFECYCLE_HISTORY_DURATION_MS,
    ]);
    interaction.dispose();
    for (const { callback } of scheduled) {
      callback();
    }

    expect(interaction.historyState).toBeNull();
    expect(interaction.acknowledgedTasks.size).toBe(0);
    expect(acknowledgements).toEqual([1]);
    expect(history).toEqual(["undo"]);
    expect(cancelled).toEqual(scheduled);
  });
});
