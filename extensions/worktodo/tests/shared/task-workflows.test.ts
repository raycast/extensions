import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELAYED_COMPLETION_POLICY,
  TaskLifecycleInteraction,
} from "../../src/shared/application/task-lifecycle-interaction";
import {
  createOperationScopedTaskEditingMutations,
  TaskEditingInteraction,
  taskEditingProjectKey,
} from "../../src/shared/application/task-editing";
import {
  loadTaskView,
  normalizeTaskView,
  resolveTaskView,
  tasksInTaskView,
  type TaskView,
} from "../../src/shared/application/task-views";
import { openWorktodoAtPath } from "../../src/shared/application/worktodo";
import {
  buildTaskViewSections,
  initialProjectIdForTaskView,
  taskViewContent,
  taskViewFromKey,
  taskViewKey,
} from "../../src/shared/presentation/task-views";

const temporaryDirectories: string[] = [];
const viewerTimeZone = "Australia/Melbourne";
const evaluationInstantMs = Date.parse("2026-08-31T02:00:00.000Z");

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("main task workflows", () => {
  it("runs Quick add through completion, undo, redo, trash, and restore against one real store", async () => {
    vi.useFakeTimers();
    const directory = await mkdtemp(join(tmpdir(), "worktodo-task-workflow-test-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "worktodo.sqlite");
    let nextId = 1;
    let now = 1_000;
    const options = {
      createId: () => id(nextId++),
      now: () => now,
      recoveryDirectory: join(directory, "recovery"),
    };
    const session = openWorktodoAtPath(databasePath, options);

    try {
      const project = session.service.createProject("Work");
      const buildSections = (view: TaskView) =>
        buildTaskViewSections(
          loadTaskView(session.service, view, { evaluationInstantMs, viewerTimeZone }),
          session.service.listProjects(),
          session.service.listLabels(),
        );
      const events: string[] = [];
      let quickSessionCloseCount = 0;
      const quickEditing = new TaskEditingInteraction(
        createOperationScopedTaskEditingMutations(() => {
          const quickSession = openWorktodoAtPath(databasePath, options);
          return {
            service: quickSession.service,
            close: () => {
              quickSession.close();
              quickSessionCloseCount += 1;
              events.push("quick session closed");
            },
          };
        }),
      );
      const quickOutcome = quickEditing.save(
        undefined,
        {
          title: "Refactor safely",
          notes: "Protect the user workflow",
          priority: false,
          dueDatePreset: "today",
          customDueAtMs: null,
          selectedProject: taskEditingProjectKey(null),
          selectedLabelIds: [],
        },
        { referenceInstantMs: evaluationInstantMs, viewerTimeZone, projects: [project], labels: [] },
      );
      if (quickOutcome.status !== "succeeded") {
        throw new Error(quickOutcome.message);
      }
      events.push("menu refreshed");
      const quickTask = quickOutcome.task;

      expect(events).toEqual(["quick session closed", "menu refreshed"]);
      expect(quickSessionCloseCount).toBe(1);
      expect(session.service.getTask(quickTask.id)).toMatchObject({
        notes: "Protect the user workflow",
        priority: false,
        projectId: null,
        due: { kind: "allDay", date: "2026-08-31" },
      });
      expect(buildSections({ kind: "today" })[0].items).toEqual([expect.objectContaining({ id: quickTask.id })]);

      now = 2_000;
      const editing = new TaskEditingInteraction(session.service);
      const savedOutcome = editing.save(
        quickTask,
        {
          title: "Refactor Worktodo safely",
          notes: "Keep behavior stable",
          priority: true,
          dueDatePreset: "tomorrow",
          customDueAtMs: null,
          selectedProject: taskEditingProjectKey(null),
          selectedLabelIds: [],
        },
        { referenceInstantMs: evaluationInstantMs, viewerTimeZone, projects: [project], labels: [] },
      );
      if (savedOutcome.status !== "succeeded") {
        throw new Error(savedOutcome.message);
      }
      events.push("task saved");
      const saved = savedOutcome.task;
      now = 3_000;
      const movedOutcome = editing.move(saved.id, taskEditingProjectKey(project.id), [project]);
      if (movedOutcome.status !== "succeeded") {
        throw new Error(movedOutcome.message);
      }
      events.push("task moved");
      const moved = movedOutcome.task;
      expect(moved).toMatchObject({
        title: "Refactor Worktodo safely",
        notes: "Keep behavior stable",
        priority: true,
        projectId: project.id,
        due: { kind: "allDay", date: "2026-09-01" },
      });
      expect(buildSections({ kind: "all" }).map((section) => section.title)).toEqual(["Work"]);
      expect(buildSections({ kind: "project", projectId: project.id })[0].items.map((item) => item.id)).toEqual([
        quickTask.id,
      ]);
      expect(buildSections({ kind: "thisWeek" })).toMatchObject([
        { key: "thisWeek:2026-09-01", title: "Tomorrow", items: [{ id: quickTask.id }] },
      ]);

      const acknowledgementSizes: number[] = [];
      const historyStates: Array<string | null> = [];
      const menuRefresh = vi.fn();
      const listRefresh = vi.fn();
      const lifecycle = new TaskLifecycleInteraction({
        mutations: session.service,
        policy: DELAYED_COMPLETION_POLICY,
        refresh: { refreshView: listRefresh, refreshRelated: menuRefresh },
        onAcknowledgementsChanged: (tasks) => acknowledgementSizes.push(tasks.size),
        onHistoryChanged: (state) => historyStates.push(state?.direction ?? null),
      });
      now = 4_000;
      const completed = lifecycle.runMutation("complete", quickTask.id);
      expect(completed.status).toBe("succeeded");
      expect(lifecycle.runMutation("complete", quickTask.id).status).toBe("duplicate");
      if (completed.status !== "succeeded" || !completed.history) {
        throw new Error("Expected completed lifecycle action");
      }
      expect(session.service.listCompleted().map((task) => task.id)).toEqual([quickTask.id]);
      expect(menuRefresh).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(1_000);
      expect(acknowledgementSizes).toEqual([1, 0]);
      expect(listRefresh).toHaveBeenCalledOnce();

      now = 5_000;
      const undone = lifecycle.runHistory(completed.history);
      expect(undone).toMatchObject({ status: "succeeded", history: { direction: "redo" } });
      expect(session.service.getTask(quickTask.id).completedAtMs).toBeNull();

      now = 6_000;
      const redone = undone.status === "succeeded" && undone.history ? lifecycle.runHistory(undone.history) : undone;
      expect(redone).toMatchObject({ status: "succeeded", history: { direction: "undo" } });
      expect(session.service.getTask(quickTask.id).completedAtMs).toBe(6_000);

      now = 7_000;
      const trashed = lifecycle.runMutation("trash", quickTask.id);
      if (trashed.status !== "succeeded" || !trashed.history) {
        throw new Error("Expected trashed lifecycle action");
      }
      expect(buildSections({ kind: "trash" })[0].items).toEqual([expect.objectContaining({ id: quickTask.id })]);
      now = 8_000;
      expect(lifecycle.runHistory(trashed.history)).toMatchObject({
        status: "succeeded",
        history: { direction: "redo" },
      });
      expect(session.service.getTask(quickTask.id)).toMatchObject({ completedAtMs: 6_000, trashedAtMs: null });
      expect(historyStates).toEqual(["undo", "redo", "undo", "undo", "redo"]);
      expect(events).toEqual(["quick session closed", "menu refreshed", "task saved", "task moved"]);
      lifecycle.dispose();
    } finally {
      session.close();
    }
  });

  it("loads every baseline view and normalizes deleted projects without adapter values", async () => {
    const directory = await mkdtemp(join(tmpdir(), "worktodo-task-view-test-"));
    temporaryDirectories.push(directory);
    let nextId = 1;
    const session = openWorktodoAtPath(join(directory, "worktodo.sqlite"), {
      createId: () => id(nextId++),
      now: () => 1_000,
      recoveryDirectory: join(directory, "recovery"),
    });
    try {
      const project = session.service.createProject("Work");
      const label = session.service.createLabel("Waiting");
      const noProject = session.service.createTask({
        title: "No project",
        projectId: null,
        labelIds: [label.id],
      });
      const today = session.service.createTask({
        title: "Today",
        projectId: project.id,
        labelIds: [label.id],
        due: { kind: "allDay", date: "2026-08-31" },
      });
      const laterThisWeek = session.service.createTask({
        title: "Tomorrow",
        projectId: project.id,
        labelIds: [label.id],
        due: { kind: "allDay", date: "2026-09-01" },
      });
      session.service.completeTask(today.id);
      session.service.trashTask(noProject.id);

      const views: TaskView[] = [
        { kind: "all" },
        { kind: "today" },
        { kind: "thisWeek" },
        { kind: "completed" },
        { kind: "trash" },
        { kind: "project", projectId: project.id },
        { kind: "label", labelId: label.id },
      ];
      const idsFor = (view: TaskView) =>
        tasksInTaskView(loadTaskView(session.service, view, { evaluationInstantMs, viewerTimeZone })).map(
          (task) => task.id,
        );

      expect(views.map((view) => [taskViewKey(view), idsFor(view)])).toEqual([
        ["all", [laterThisWeek.id]],
        ["today", []],
        ["thisWeek", [laterThisWeek.id]],
        ["completed", [today.id]],
        ["trash", [noProject.id]],
        [`project:${project.id}`, [laterThisWeek.id]],
        [`label:${label.id}`, [laterThisWeek.id]],
      ]);
      expect(taskViewFromKey(`project:${project.id}`, [project], [label])).toEqual({
        kind: "project",
        projectId: project.id,
      });
      expect(taskViewFromKey(`label:${label.id}`, [project], [label])).toEqual({ kind: "label", labelId: label.id });
      expect(normalizeTaskView({ kind: "project", projectId: project.id }, [], [label])).toEqual({ kind: "all" });
      expect(normalizeTaskView({ kind: "label", labelId: label.id }, [project], [])).toEqual({ kind: "all" });
      expect(initialProjectIdForTaskView({ kind: "project", projectId: project.id })).toBe(project.id);
      expect(initialProjectIdForTaskView({ kind: "label", labelId: label.id })).toBeNull();
      expect(taskViewContent({ kind: "project", projectId: project.id }, [project], [label])).toMatchObject({
        title: "Work",
        searchPlaceholder: "Search Work",
      });
      expect(taskViewContent({ kind: "label", labelId: label.id }, [project], [label])).toMatchObject({
        title: "Waiting",
        searchPlaceholder: "Search Waiting",
        emptyTitle: "No tasks with this label",
      });
      session.service.removeLabel(label.id);
      expect(session.service.getTask(laterThisWeek.id).labelIds).toEqual([]);
      expect(
        normalizeTaskView(
          { kind: "label", labelId: label.id },
          session.service.listProjects(),
          session.service.listLabels(),
        ),
      ).toEqual({ kind: "all" });
    } finally {
      session.close();
    }
  });

  it("preserves Today status, This week local date, and canonical input validation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "worktodo-task-view-context-test-"));
    temporaryDirectories.push(directory);
    let nextId = 1;
    const session = openWorktodoAtPath(join(directory, "worktodo.sqlite"), {
      createId: () => id(nextId++),
      now: () => 1_000,
      recoveryDirectory: join(directory, "recovery"),
    });
    try {
      const project = session.service.createProject("Work");
      const overdue = session.service.createTask({
        title: "Overdue",
        projectId: null,
        due: { kind: "allDay", date: "2026-08-30" },
      });
      const today = session.service.createTask({
        title: "Today",
        projectId: project.id,
        due: { kind: "allDay", date: "2026-08-31" },
      });
      const laterThisWeek = session.service.createTask({
        title: "Tomorrow",
        projectId: project.id,
        due: { kind: "allDay", date: "2026-09-01" },
      });
      const context = { evaluationInstantMs, viewerTimeZone: "Australia/Victoria" };

      const todayView = loadTaskView(session.service, { kind: "today" }, context);
      expect(todayView).toMatchObject({
        evaluatedAtMs: evaluationInstantMs,
        viewerTimeZone,
        result: {
          tasks: [
            { task: { id: overdue.id }, status: "overdue" },
            { task: { id: today.id }, status: "dueToday" },
          ],
        },
      });
      const thisWeekView = loadTaskView(session.service, { kind: "thisWeek" }, context);
      expect(thisWeekView).toMatchObject({
        viewerTimeZone,
        result: {
          tasks: [
            { task: { id: overdue.id }, status: "overdue", localDate: "2026-08-30" },
            { task: { id: today.id }, status: "dueToday", localDate: "2026-08-31" },
            { task: { id: laterThisWeek.id }, status: "laterThisWeek", localDate: "2026-09-01" },
          ],
        },
      });

      const boundaryInstantMs = Date.parse("2026-08-31T14:30:00.000Z");
      const utcToday = loadTaskView(
        session.service,
        { kind: "today" },
        {
          evaluationInstantMs: boundaryInstantMs,
          viewerTimeZone: "UTC",
        },
      );
      const melbourneToday = loadTaskView(
        session.service,
        { kind: "today" },
        {
          evaluationInstantMs: boundaryInstantMs,
          viewerTimeZone,
        },
      );
      expect(utcToday.result.tasks.find((entry) => entry.task.id === today.id)?.status).toBe("dueToday");
      expect(melbourneToday.result.tasks.find((entry) => entry.task.id === today.id)?.status).toBe("overdue");
      expect(melbourneToday.result.tasks.find((entry) => entry.task.id === laterThisWeek.id)?.status).toBe("dueToday");

      expect(resolveTaskView("project", project.id, undefined)).toEqual({
        kind: "project",
        projectId: project.id,
      });
      expect(resolveTaskView("label", undefined, id(99))).toEqual({ kind: "label", labelId: id(99) });
      expect(() => resolveTaskView("project", undefined, undefined)).toThrow("The project view requires projectId");
      expect(() => resolveTaskView("label", undefined, undefined)).toThrow("The label view requires labelId");
      expect(() => resolveTaskView("all", project.id, undefined)).toThrow(
        "projectId is valid only for the project view",
      );
      expect(() => resolveTaskView("all", undefined, id(99))).toThrow("labelId is valid only for the label view");
      expect(() => loadTaskView(session.service, { kind: "all" }, { ...context, evaluationInstantMs: -1 })).toThrow(
        "Evaluation instant must be a representable Unix-millisecond timestamp",
      );
    } finally {
      session.close();
    }
  });
});
