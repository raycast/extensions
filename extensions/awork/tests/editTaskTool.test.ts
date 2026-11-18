jest.mock("../src/composables/TaskApi", () => ({
  taskApiRequest: jest.fn(),
  requireSuccessfulTaskApiResponse: jest.fn(async (result) => result),
}));

import { buildEditTaskToolValues, hasRequestedTaskEdit } from "../src/composables/EditTaskTool";
import { EditableTask } from "../src/composables/EditTask";

const taskId = "123e4567-e89b-42d3-a456-426614174000";
const projectId = "223e4567-e89b-42d3-a456-426614174000";
const parentTaskId = "323e4567-e89b-42d3-a456-426614174000";
const statusId = "423e4567-e89b-42d3-a456-426614174000";
const typeOfWorkId = "523e4567-e89b-42d3-a456-426614174000";
const taskListId = "623e4567-e89b-42d3-a456-426614174000";
const assigneeId = "723e4567-e89b-42d3-a456-426614174000";

const task = (overrides: Partial<EditableTask> = {}): EditableTask => ({
  id: taskId,
  name: "Prepare launch",
  description: "Original description",
  isPrio: false,
  startOn: "2026-08-10T00:00:00Z",
  dueOn: "2026-08-20T00:00:00Z",
  plannedDuration: 3600,
  baseType: "projecttask",
  taskStatusId: statusId,
  typeOfWorkId,
  projectId,
  parentId: null,
  assignees: [],
  lists: [],
  ...overrides,
});

describe("buildEditTaskToolValues", () => {
  it("changes only specified fields and preserves all others", () => {
    const values = buildEditTaskToolValues(task(), {
      taskId,
      name: "  Ship launch  ",
      isPrio: true,
    });

    expect(values).toMatchObject({
      name: "Ship launch",
      description: "Original description",
      projectId,
      parentTaskId: "none",
      taskStatusId: statusId,
      typeOfWorkId,
      plannedDuration: "1h",
      isPrio: true,
    });
    expect(values.startOn).toEqual(new Date(2026, 7, 10));
    expect(values.dueOn).toEqual(new Date(2026, 7, 20));
  });

  it("supports explicit clearing and replacing project-only fields", () => {
    const values = buildEditTaskToolValues(
      task({ parentId: parentTaskId, lists: [{ id: taskListId }], assignees: [{ id: assigneeId }] }),
      {
        taskId,
        clearDescription: true,
        clearParentTask: true,
        clearTaskList: true,
        clearAssignees: true,
        clearStartOn: true,
        clearDueOn: true,
        clearPlannedDuration: true,
      },
    );

    expect(values).toMatchObject({
      description: "",
      parentTaskId: "none",
      taskListId: "none",
      assigneeIds: [],
      startOn: null,
      dueOn: null,
      plannedDuration: "",
    });
  });

  it("validates UUIDs, date ranges, durations, and conflicting clear options", () => {
    expect(() => buildEditTaskToolValues(task(), { taskId, taskStatusId: "In Progress" })).toThrow(
      "taskStatusId must be an awork UUID",
    );
    expect(() => buildEditTaskToolValues(task(), { taskId, startOn: "2026-08-21" })).toThrow(
      "dueOn cannot be before startOn",
    );
    expect(() => buildEditTaskToolValues(task(), { taskId, plannedDuration: "two hours" })).toThrow(
      "Please enter valid duration",
    );
    expect(() => buildEditTaskToolValues(task(), { taskId, parentTaskId, clearParentTask: true })).toThrow(
      "parentTaskId and its clear option cannot be used together",
    );
  });

  it("requires the explicit clear options to empty a field", () => {
    expect(() => buildEditTaskToolValues(task(), { taskId, description: "  " })).toThrow(
      "Use clearDescription=true to remove the description",
    );
    expect(() => buildEditTaskToolValues(task(), { taskId, plannedDuration: " " })).toThrow(
      "Use clearPlannedDuration=true to remove planned effort",
    );
  });

  it("rejects project-only edits for private tasks", () => {
    expect(() =>
      buildEditTaskToolValues(task({ baseType: "private", projectId: null, lists: null, assignees: null }), {
        taskId,
        assigneeIds: [assigneeId],
      }),
    ).toThrow("Private tasks cannot change parent tasks, task lists, or assignees");
  });

  it("requires at least one actual requested edit", () => {
    expect(hasRequestedTaskEdit({ taskId })).toBe(false);
    expect(hasRequestedTaskEdit({ taskId, clearDescription: false })).toBe(false);
    expect(hasRequestedTaskEdit({ taskId, isPrio: false })).toBe(true);
    expect(() => buildEditTaskToolValues(task(), { taskId })).toThrow("At least one task field");
  });
});
