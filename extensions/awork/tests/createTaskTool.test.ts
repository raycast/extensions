import {
  buildCreateTaskToolValues,
  parseTaskToolAssigneeIds,
  parseTaskToolDate,
  requireAworkUuid,
  validateParentTask,
} from "../src/composables/CreateTaskTool";

const projectId = "123e4567-e89b-42d3-a456-426614174000";
const parentTaskId = "223e4567-e89b-42d3-a456-426614174000";
const taskListId = "323e4567-e89b-42d3-a456-426614174000";
const typeOfWorkId = "423e4567-e89b-42d3-a456-426614174000";
const assigneeId = "523e4567-e89b-42d3-a456-426614174000";

describe("buildCreateTaskToolValues", () => {
  it("builds a project task and prefills an empty due date", () => {
    const values = buildCreateTaskToolValues({
      name: "  Prepare launch  ",
      projectId,
      parentTaskId,
      taskListId,
      typeOfWorkId,
      assigneeIds: [assigneeId, assigneeId],
      startOn: "2026-08-12",
      plannedDuration: "2h",
      isPrio: true,
    });

    expect(values).toMatchObject({
      name: "Prepare launch",
      projectId,
      parentTaskId,
      taskListId,
      typeOfWorkId,
      assigneeIds: [assigneeId],
      plannedDuration: "2h",
      isPrio: true,
    });
    expect(values.startOn).toEqual(new Date(2026, 7, 12));
    expect(values.dueOn).toEqual(new Date(2026, 7, 12));
  });

  it("builds an explicit private task", () => {
    expect(buildCreateTaskToolValues({ name: "Personal reminder", isPrivate: true })).toMatchObject({
      name: "Personal reminder",
      projectId: "none",
      parentTaskId: "none",
      taskListId: "none",
      assigneeIds: [],
      startOn: null,
      dueOn: null,
    });
  });

  it("requires an explicit project or private-task choice", () => {
    expect(() => buildCreateTaskToolValues({ name: "Ambiguous task" })).toThrow(
      "projectId is required unless the user explicitly requested a private task",
    );
  });

  it("rejects project-only fields for private tasks", () => {
    expect(() => buildCreateTaskToolValues({ name: "Private", isPrivate: true, assigneeIds: [assigneeId] })).toThrow(
      "Private tasks cannot have a parent task, task list, or assignees",
    );
  });

  it("rejects names in fields that require an awork UUID", () => {
    expect(() => buildCreateTaskToolValues({ name: "Task", projectId: "Website Relaunch" })).toThrow(
      "projectId must be an awork UUID, not a name",
    );
  });

  it("rejects invalid dates and date ranges", () => {
    expect(() => parseTaskToolDate("2026-02-30", "startOn")).toThrow("startOn is not a valid calendar date");
    expect(() =>
      buildCreateTaskToolValues({ name: "Task", projectId, startOn: "2026-08-12", dueOn: "2026-08-11" }),
    ).toThrow("dueOn cannot be before startOn");
  });

  it("rejects invalid planned effort", () => {
    expect(() => buildCreateTaskToolValues({ name: "Task", projectId, plannedDuration: "two hours" })).toThrow(
      "Please enter valid duration",
    );
  });

  it("parses comma-separated assignee IDs for the Raycast tool schema", () => {
    expect(parseTaskToolAssigneeIds(` ${assigneeId},,${assigneeId} `)).toEqual([assigneeId, assigneeId]);
  });

  it("validates required UUIDs for lookup tools", () => {
    expect(requireAworkUuid(` ${projectId} `, "projectId")).toBe(projectId);
    expect(() => requireAworkUuid("Website Relaunch", "projectId")).toThrow(
      "projectId must be an awork UUID, not a name",
    );
  });

  it("accepts only a top-level parent in the selected project", () => {
    const parent = { id: parentTaskId, projectId, typeOfWorkId };

    expect(validateParentTask(parent, projectId, parentTaskId)).toBe(parent);
    expect(() => validateParentTask(undefined, projectId, parentTaskId)).toThrow(
      "parent task was not found in the selected project",
    );
    expect(() => validateParentTask({ ...parent, projectId: taskListId }, projectId, parentTaskId)).toThrow(
      "parent task must be in the same project",
    );
    expect(() => validateParentTask({ ...parent, parentId: taskListId }, projectId, parentTaskId)).toThrow(
      "A subtask cannot be used as the parent",
    );
  });
});
