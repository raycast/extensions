import {
  findSelectableParentTask,
  getSelectableParentTasks,
  normalizeCreateTaskDraftValues,
  normalizeFormString,
} from "../src/composables/CreateTaskDraft";

describe("Create Task draft normalization", () => {
  it("keeps primitive dropdown IDs", () => {
    expect(normalizeFormString("project-id")).toBe("project-id");
  });

  it("unwraps Raycast 2 draft dropdown objects", () => {
    expect(normalizeFormString({ value: "project-id", title: "Website" })).toBe("project-id");
    expect(normalizeFormString({ id: "status-id", name: "To Do" })).toBe("status-id");
  });

  it("normalizes every dropdown and tag-picker draft value to IDs", () => {
    expect(
      normalizeCreateTaskDraftValues({
        projectId: { value: "project-id" },
        parentTaskId: { value: "parent-id" },
        taskStatusId: { value: "status-id" },
        typeOfWorkId: { value: "type-id" },
        taskListId: { value: "list-id" },
        assigneeIds: [{ value: "user-1" }, "user-2"],
      }),
    ).toMatchObject({
      projectId: "project-id",
      parentTaskId: "parent-id",
      taskStatusId: "status-id",
      typeOfWorkId: "type-id",
      taskListId: "list-id",
      assigneeIds: ["user-1", "user-2"],
    });
  });

  it("clears project-only values from private-task drafts", () => {
    expect(
      normalizeCreateTaskDraftValues({
        projectId: { value: "private" },
        parentTaskId: { value: "parent-id" },
        taskListId: { value: "list-id" },
        assigneeIds: [{ value: "user-1" }],
      }),
    ).toMatchObject({ projectId: "none", parentTaskId: "none", taskListId: "none", assigneeIds: [] });
  });

  it("restores serialized dates without leaking invalid values", () => {
    const normalized = normalizeCreateTaskDraftValues({
      startOn: { value: "2026-08-12T00:00:00.000Z" },
      dueOn: { value: "not-a-date" },
    });

    expect(normalized.startOn).toEqual(new Date("2026-08-12T00:00:00.000Z"));
    expect(normalized).not.toHaveProperty("dueOn");
  });

  it("only exposes top-level tasks as parent options", () => {
    const tasks = [
      { id: "top-level", projectId: "project-1" },
      { id: "subtask", projectId: "project-1", parentId: "top-level" },
    ];

    expect(getSelectableParentTasks(tasks)).toEqual([{ id: "top-level", projectId: "project-1" }]);
    expect(findSelectableParentTask(tasks, "subtask", "project-1")).toBeUndefined();
  });

  it("does not restore a parent from another project", () => {
    const tasks = [{ id: "parent", projectId: "project-1", typeOfWorkId: "development" }];

    expect(findSelectableParentTask(tasks, "parent", "project-2")).toBeUndefined();
    expect(findSelectableParentTask(tasks, "parent", "project-1")).toEqual(tasks[0]);
  });
});
