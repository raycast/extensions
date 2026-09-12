jest.mock("../src/composables/TaskApi", () => ({
  taskApiRequest: jest.fn(),
  requireSuccessfulTaskApiResponse: jest.fn(async (result) => result),
}));

import {
  buildEditTaskPayload,
  buildEditTaskValues,
  EditableTask,
  formatPlannedDuration,
  getEditTaskChanges,
  updateTask,
  validateEditTaskParent,
} from "../src/composables/EditTask";
import { taskApiRequest } from "../src/composables/TaskApi";
import { CreateTaskValues } from "../src/composables/TaskPayload";

const taskApiRequestMock = taskApiRequest as jest.MockedFunction<typeof taskApiRequest>;

const task = (overrides: Partial<EditableTask> = {}): EditableTask => ({
  id: "task-id",
  name: "Create logo concept",
  description: "Draft three variants",
  isPrio: true,
  startOn: "2026-08-11T10:00:00Z",
  dueOn: "2026-08-15T18:00:00Z",
  plannedDuration: 5400,
  baseType: "projecttask",
  taskStatusId: "status-id",
  typeOfWorkId: "type-id",
  projectId: "project-id",
  project: { id: "project-id", name: "Website" },
  parentId: "parent-id",
  numberOfSubtasks: 0,
  assignees: [{ id: "assignee-id", firstName: "Andrea" }],
  lists: [{ id: "list-id", name: "Backlog", isPrimary: true }],
  taskIdentifier: "WEB-42",
  ...overrides,
});

describe("Edit Task form values", () => {
  it("prefills the Create Task fields from the complete task", () => {
    expect(buildEditTaskValues(task())).toEqual({
      name: "Create logo concept",
      projectId: "project-id",
      parentTaskId: "parent-id",
      description: "Draft three variants",
      taskStatusId: "status-id",
      typeOfWorkId: "type-id",
      taskListId: "list-id",
      assigneeIds: ["assignee-id"],
      startOn: new Date(2026, 7, 11),
      dueOn: new Date(2026, 7, 15),
      plannedDuration: "1h 30m",
      isPrio: true,
    });
  });

  it("prefills private tasks without project-only values", () => {
    expect(
      buildEditTaskValues(task({ baseType: "private", projectId: null, parentId: null, lists: null, assignees: null })),
    ).toMatchObject({ projectId: "none", parentTaskId: "none", taskListId: "none", assigneeIds: [] });
  });

  it("formats planned effort for the form", () => {
    expect(formatPlannedDuration(3600)).toBe("1h");
    expect(formatPlannedDuration(2700)).toBe("45m");
    expect(formatPlannedDuration(5430)).toBe("1h 31m");
    expect(formatPlannedDuration(null)).toBe("");
  });

  it("builds nullable update values so fields can be cleared", () => {
    const values = buildEditTaskValues(task());
    expect(
      buildEditTaskPayload({
        ...values,
        name: "  Updated task  ",
        description: " ",
        startOn: null,
        dueOn: null,
        plannedDuration: "",
      }),
    ).toEqual({
      name: "Updated task",
      description: null,
      isPrio: true,
      startOn: null,
      dueOn: null,
      plannedDuration: null,
    });
  });
});

describe("Edit Task parent rules", () => {
  it("allows only a top-level parent in the same project", () => {
    const editedTask = task({ parentId: null });
    const parent = { id: "new-parent", projectId: "project-id" };

    expect(() => validateEditTaskParent(editedTask, parent, parent.id)).not.toThrow();
    expect(() => validateEditTaskParent(editedTask, { ...parent, parentId: "root" }, parent.id)).toThrow(
      "A subtask cannot be used as the parent",
    );
    expect(() => validateEditTaskParent(editedTask, { ...parent, projectId: "other" }, parent.id)).toThrow(
      "same project",
    );
    expect(() => validateEditTaskParent(editedTask, { ...parent, id: editedTask.id }, editedTask.id)).toThrow(
      "nested under itself",
    );
  });

  it("does not allow a task with subtasks to become a subtask", () => {
    expect(() =>
      validateEditTaskParent(
        task({ parentId: null, numberOfSubtasks: 2 }),
        {
          id: "parent",
          projectId: "project-id",
        },
        "parent",
      ),
    ).toThrow("A task with subtasks cannot be nested");
  });

  it("detects attaching, changing and detaching parent relationships", () => {
    const values = buildEditTaskValues(task());
    expect(getEditTaskChanges(task(), values).parent).toBe("unchanged");
    expect(getEditTaskChanges(task(), { ...values, parentTaskId: "new-parent" }).parent).toBe("attach");
    expect(getEditTaskChanges(task(), { ...values, parentTaskId: "none" }).parent).toBe("detach");
  });

  it("never detaches private subtasks, whose parent the form cannot manage", () => {
    const privateSubtask = task({
      baseType: "private",
      projectId: null,
      parentId: "private-parent",
      lists: null,
      assignees: null,
    });
    const values = buildEditTaskValues(privateSubtask);

    expect(values.parentTaskId).toBe("none");
    expect(getEditTaskChanges(privateSubtask, values).parent).toBe("unchanged");
  });
});

describe("updateTask", () => {
  beforeEach(() => {
    taskApiRequestMock.mockReset();
    taskApiRequestMock.mockResolvedValue({ response: new Response(null, { status: 204 }), token: "token" });
  });

  it("updates the parent before the regular task fields and related reference data", async () => {
    const original = task({ parentId: null, assignees: [] });
    const values: CreateTaskValues = {
      ...buildEditTaskValues(original),
      name: "Renamed task",
      parentTaskId: "new-parent",
      taskStatusId: "new-status",
      typeOfWorkId: "new-type",
      taskListId: "new-list",
      assigneeIds: ["new-assignee"],
    };

    await updateTask("token", original, values);

    expect(taskApiRequestMock.mock.calls.map(([path]) => path)).toEqual([
      "tasks/changesubtasks",
      "tasks/task-id",
      "tasks/changestatuses",
      "tasks/changetypeofwork",
      "tasks/changelists",
      "tasks/task-id/setassignees",
    ]);
    expect(JSON.parse(String(taskApiRequestMock.mock.calls[0][2]?.body))).toEqual([
      { taskId: "task-id", parentId: "new-parent" },
    ]);
  });

  it("converts a subtask back to a top-level task", async () => {
    const original = task();
    await updateTask("token", original, { ...buildEditTaskValues(original), parentTaskId: "none" });

    expect(taskApiRequestMock.mock.calls.map(([path]) => path)).toEqual(["tasks/changesubtaskstoparent"]);
  });

  it("only updates the task fields when saving a private subtask", async () => {
    const original = task({
      baseType: "private",
      projectId: null,
      parentId: "private-parent",
      lists: null,
      assignees: null,
    });
    await updateTask("token", original, { ...buildEditTaskValues(original), name: "Renamed task" });

    expect(taskApiRequestMock.mock.calls.map(([path]) => path)).toEqual(["tasks/task-id"]);
  });

  it("sends no request when nothing changed", async () => {
    const original = task();
    await updateTask("token", original, buildEditTaskValues(original));

    expect(taskApiRequestMock).not.toHaveBeenCalled();
  });

  it("keeps a planned duration that is not minute-aligned when only the status changes", async () => {
    const original = task({ plannedDuration: 5430 });
    await updateTask("token", original, { ...buildEditTaskValues(original), taskStatusId: "new-status" });

    expect(taskApiRequestMock.mock.calls.map(([path]) => path)).toEqual(["tasks/changestatuses"]);
  });

  it("rejects project changes", async () => {
    await expect(
      updateTask("token", task(), { ...buildEditTaskValues(task()), projectId: "other-project" }),
    ).rejects.toThrow("project of a task cannot be changed");
    expect(taskApiRequestMock).not.toHaveBeenCalled();
  });
});
