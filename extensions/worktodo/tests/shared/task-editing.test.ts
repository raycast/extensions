import { describe, expect, it, vi } from "vitest";
import {
  createOperationScopedTaskEditingMutations,
  TaskEditingInteraction,
  taskEditingDefaults,
  taskEditingProjectIdFromKey,
  taskEditingProjectKey,
  type TaskEditingContext,
  type TaskEditingMutations,
  type TaskEditingValues,
} from "../../src/shared/application/task-editing";
import { DomainError, type Label, type Project, type Task } from "../../src/shared/domain/model";

const project: Project = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Work",
  position: 1_024,
  createdAtMs: 1_000,
  updatedAtMs: 1_000,
};
const otherProject: Project = {
  ...project,
  id: "00000000-0000-4000-8000-000000000002",
  name: "Personal",
};
const label: Label = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "Waiting",
  position: 1_024,
  createdAtMs: 1_000,
  updatedAtMs: 1_000,
};
const otherLabel: Label = {
  ...label,
  id: "00000000-0000-4000-8000-000000000011",
  name: "High Impact",
  position: 2_048,
};
const referenceInstantMs = Date.parse("2026-08-30T14:30:00.000Z");

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "00000000-0000-4000-8000-000000000004",
    title: "Review plan",
    notes: "Keep the behavior",
    priority: true,
    position: 1_024,
    projectId: null,
    labelIds: [],
    due: { kind: "none" },
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
    completedAtMs: null,
    trashedAtMs: null,
    ...overrides,
  };
}

function context(overrides: Partial<TaskEditingContext> = {}): TaskEditingContext {
  return {
    referenceInstantMs,
    viewerTimeZone: "Australia/Melbourne",
    projects: [project, otherProject],
    labels: [label, otherLabel],
    ...overrides,
  };
}

function values(overrides: Partial<TaskEditingValues> = {}): TaskEditingValues {
  return {
    title: "Review plan",
    notes: "Keep the behavior",
    priority: true,
    dueDatePreset: "none",
    customDueAtMs: null,
    selectedProject: taskEditingProjectKey(null),
    selectedLabelIds: [],
    ...overrides,
  };
}

function mutations() {
  return {
    createTask: vi.fn<TaskEditingMutations["createTask"]>((input) =>
      task({
        title: input.title,
        notes: input.notes ?? "",
        priority: input.priority ?? false,
        labelIds: input.labelIds ?? [],
        projectId: input.projectId ?? null,
        due: input.due ?? { kind: "none" },
      }),
    ),
    updateTask: vi.fn<TaskEditingMutations["updateTask"]>((_taskId, input) =>
      task({
        title: input.title,
        notes: input.notes,
        priority: input.priority,
        labelIds: input.labelIds,
        due: input.due,
      }),
    ),
    moveTask: vi.fn<TaskEditingMutations["moveTask"]>((_taskId, projectId) => task({ projectId })),
  };
}

describe("Task editing interaction", () => {
  it("owns new and edit defaults for every Due kind", () => {
    expect(taskEditingDefaults(undefined, project.id, referenceInstantMs, "Australia/Melbourne")).toEqual({
      title: "",
      notes: "",
      priority: false,
      dueDatePreset: "none",
      customDueAtMs: null,
      selectedProject: taskEditingProjectKey(project.id),
      selectedLabelIds: [],
    });

    expect(
      taskEditingDefaults(
        task({
          projectId: project.id,
          labelIds: [label.id, otherLabel.id],
          due: { kind: "allDay", date: "2026-08-31" },
        }),
        null,
        referenceInstantMs,
        "Australia/Melbourne",
      ),
    ).toMatchObject({
      dueDatePreset: "today",
      customDueAtMs: Date.parse("2026-08-30T14:00:00.000Z"),
      selectedProject: taskEditingProjectKey(project.id),
      selectedLabelIds: [label.id, otherLabel.id],
    });

    expect(
      taskEditingDefaults(
        task({ due: { kind: "timed", instantMs: 2_000_000, timeZone: "Pacific/Auckland" } }),
        null,
        referenceInstantMs,
        "America/Los_Angeles",
      ),
    ).toMatchObject({ dueDatePreset: "custom", customDueAtMs: 2_000_000 });
  });

  it.each([
    ["none", { kind: "none" }],
    ["today", { kind: "allDay", date: "2026-08-31" }],
    ["tomorrow", { kind: "allDay", date: "2026-09-01" }],
    ["endOfWeek", { kind: "allDay", date: "2026-09-06" }],
  ] as const)("creates the %s Due preset through one interface", (dueDatePreset, due) => {
    const adapter = mutations();
    const outcome = new TaskEditingInteraction(adapter).save(undefined, values({ dueDatePreset }), context());

    expect(outcome).toMatchObject({ status: "succeeded", operation: "create", task: { due } });
    expect(adapter.createTask).toHaveBeenCalledWith(expect.objectContaining({ due }));
  });

  it("converts custom dates in the explicit viewer timezone", () => {
    const adapter = mutations();
    const customDueAtMs = Date.parse("2026-08-31T06:30:00.000Z");

    new TaskEditingInteraction(adapter).save(
      undefined,
      values({ dueDatePreset: "custom", customDueAtMs }),
      context({ viewerTimeZone: "America/Los_Angeles" }),
    );

    expect(adapter.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ due: { kind: "allDay", date: "2026-08-30" } }),
    );
  });

  it("preserves an unchanged timed Due exactly and treats a changed value as all-day", () => {
    const original = task({ due: { kind: "timed", instantMs: 2_000_000, timeZone: "Pacific/Auckland" } });
    const adapter = mutations();
    const editing = new TaskEditingInteraction(adapter);

    editing.save(
      original,
      values({ dueDatePreset: "custom", customDueAtMs: original.due.kind === "timed" ? original.due.instantMs : 0 }),
      context({ viewerTimeZone: "America/Los_Angeles" }),
    );
    expect(adapter.updateTask).toHaveBeenLastCalledWith(
      original.id,
      expect.objectContaining({ due: { kind: "timed", instantMs: 2_000_000, timeZone: "Pacific/Auckland" } }),
    );

    const changedDueAtMs = Date.parse("2026-08-31T06:30:00.000Z");
    editing.save(
      original,
      values({ dueDatePreset: "custom", customDueAtMs: changedDueAtMs }),
      context({ viewerTimeZone: "America/Los_Angeles" }),
    );
    expect(adapter.updateTask).toHaveBeenLastCalledWith(
      original.id,
      expect.objectContaining({ due: { kind: "allDay", date: "2026-08-30" } }),
    );
  });

  it("updates fields without re-resolving or moving the Task project", () => {
    const original = task({ projectId: project.id });
    const adapter = mutations();
    const outcome = new TaskEditingInteraction(adapter).save(
      original,
      values({ selectedProject: "stale-project-value" }),
      context({ projects: [] }),
    );

    expect(outcome).toMatchObject({ status: "succeeded", operation: "update" });
    expect(adapter.updateTask).toHaveBeenCalledOnce();
    expect(adapter.moveTask).not.toHaveBeenCalled();
  });

  it("creates multiple assignments in catalog order and clears them during editing", () => {
    const adapter = mutations();
    const editing = new TaskEditingInteraction(adapter);

    const created = editing.save(undefined, values({ selectedLabelIds: [otherLabel.id, label.id] }), context());
    expect(created).toMatchObject({
      status: "succeeded",
      task: { labelIds: [label.id, otherLabel.id] },
    });
    expect(adapter.createTask).toHaveBeenCalledWith(expect.objectContaining({ labelIds: [label.id, otherLabel.id] }));

    const original = task({ labelIds: [label.id, otherLabel.id] });
    editing.save(original, values({ title: "Changed", selectedLabelIds: original.labelIds }), context());
    expect(adapter.updateTask).toHaveBeenLastCalledWith(
      original.id,
      expect.objectContaining({ title: "Changed", labelIds: [label.id, otherLabel.id] }),
    );

    editing.save(original, values({ selectedLabelIds: [] }), context());
    expect(adapter.updateTask).toHaveBeenLastCalledWith(original.id, expect.objectContaining({ labelIds: [] }));
  });

  it.each([
    ["a stale Label", [label.id], [] as Label[], "Label not found"],
    ["a missing Label", ["00000000-0000-4000-8000-000000000099"], [label], "Label not found"],
    ["duplicate Labels", [label.id, label.id], [label], "Label IDs cannot contain duplicates"],
  ])("rejects %s before persistence", (_case, selectedLabelIds, labels, message) => {
    const adapter = mutations();
    const outcome = new TaskEditingInteraction(adapter).save(
      undefined,
      values({ selectedLabelIds }),
      context({ labels }),
    );

    expect(outcome).toEqual({ status: "failed", operation: "create", field: "labels", message });
    expect(adapter.createTask).not.toHaveBeenCalled();
  });

  it.each([
    ["no project", taskEditingProjectKey(null), null],
    ["a Project", taskEditingProjectKey(project.id), project.id],
  ] as const)("resolves %s creation against the current catalog", (_label, selectedProject, projectId) => {
    const adapter = mutations();
    const outcome = new TaskEditingInteraction(adapter).save(undefined, values({ selectedProject }), context());

    expect(outcome.status).toBe("succeeded");
    expect(adapter.createTask).toHaveBeenCalledWith(expect.objectContaining({ projectId }));
  });

  it("returns a stable Project failure for a missing Project", () => {
    const adapter = mutations();
    const outcome = new TaskEditingInteraction(adapter).save(
      undefined,
      values({ selectedProject: taskEditingProjectKey(project.id) }),
      context({ projects: [] }),
    );

    expect(outcome).toEqual({
      status: "failed",
      operation: "create",
      field: "project",
      message: "Choose an existing project",
    });
    expect(adapter.createTask).not.toHaveBeenCalled();
  });

  it("returns field-aware validation and persistence failures", () => {
    const adapter = mutations();
    const editing = new TaskEditingInteraction(adapter);

    expect(editing.save(undefined, values({ title: "  " }), context())).toEqual({
      status: "failed",
      operation: "create",
      field: "title",
      message: "Title cannot be empty",
    });
    expect(editing.save(undefined, values({ dueDatePreset: "custom", customDueAtMs: null }), context())).toEqual({
      status: "failed",
      operation: "create",
      field: "due",
      message: "Choose a custom due date",
    });
    expect(
      editing.save(
        undefined,
        values({
          dueDatePreset: "custom",
          customDueAtMs: null,
          selectedProject: taskEditingProjectKey(project.id),
        }),
        context({ projects: [] }),
      ),
    ).toMatchObject({ status: "failed", field: "due" });

    adapter.createTask.mockImplementationOnce(() => {
      throw new Error("Database unavailable");
    });
    expect(editing.save(undefined, values(), context())).toEqual({
      status: "failed",
      operation: "create",
      field: "form",
      message: "Database unavailable",
    });

    adapter.updateTask.mockImplementationOnce(() => {
      throw new DomainError("INVALID_DUE_VALUE", "Stored Due is invalid");
    });
    expect(editing.save(task(), values(), context())).toEqual({
      status: "failed",
      operation: "update",
      field: "due",
      message: "Stored Due is invalid",
    });

    adapter.updateTask.mockImplementationOnce(() => {
      throw new DomainError("NOT_FOUND", "Label not found");
    });
    expect(editing.assignLabels(task().id, [label.id])).toEqual({
      status: "failed",
      operation: "update",
      field: "labels",
      message: "Label not found",
    });
  });

  it("uses identical create semantics for long-lived and operation-scoped adapters", () => {
    const direct = mutations();
    const scoped = mutations();
    const close = vi.fn();
    const submission = values({
      title: " Shared values ",
      dueDatePreset: "tomorrow",
      selectedProject: taskEditingProjectKey(project.id),
    });

    new TaskEditingInteraction(direct).save(undefined, submission, context());
    new TaskEditingInteraction(createOperationScopedTaskEditingMutations(() => ({ service: scoped, close }))).save(
      undefined,
      submission,
      context(),
    );

    expect(scoped.createTask).toHaveBeenCalledWith(direct.createTask.mock.calls[0][0]);
    expect(close).toHaveBeenCalledOnce();
  });

  it("closes an operation-scoped session after persistence failure", () => {
    const adapter = mutations();
    adapter.createTask.mockImplementationOnce(() => {
      throw new Error("Write failed");
    });
    const close = vi.fn();
    const editing = new TaskEditingInteraction(
      createOperationScopedTaskEditingMutations(() => ({ service: adapter, close })),
    );

    expect(editing.save(undefined, values(), context())).toMatchObject({ status: "failed", field: "form" });
    expect(close).toHaveBeenCalledOnce();
  });

  it("moves through the same catalog-aware interface without coupling editing to Project state", () => {
    const adapter = mutations();
    const editing = new TaskEditingInteraction(adapter);
    const selectedProject = taskEditingProjectKey(project.id);

    expect(editing.move(task().id, selectedProject, [project])).toMatchObject({
      status: "succeeded",
      operation: "move",
      task: { projectId: project.id },
    });
    expect(taskEditingProjectIdFromKey(selectedProject, [project])).toBe(project.id);
  });
});
