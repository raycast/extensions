import { buildCreateTaskPayload, CreateTaskValues } from "../src/composables/TaskPayload";

const values = (overrides: Partial<CreateTaskValues> = {}): CreateTaskValues => ({
  name: "  Create logo concept  ",
  projectId: "project-id",
  parentTaskId: "none",
  description: "",
  taskStatusId: "none",
  typeOfWorkId: "none",
  taskListId: "none",
  assigneeIds: [],
  startOn: null,
  dueOn: null,
  plannedDuration: "",
  isPrio: false,
  ...overrides,
});

describe("buildCreateTaskPayload", () => {
  it("builds the required project task payload", () => {
    expect(buildCreateTaskPayload(values())).toEqual({
      name: "Create logo concept",
      baseType: "projecttask",
      entityId: "project-id",
      isPrio: false,
    });
  });

  it("adds the optional awork task fields", () => {
    // Constructed in local time on purpose: the payload must contain the calendar
    // day the user picked, independent of the timezone the tests run in.
    const startOn = new Date(2026, 7, 11, 8, 0);
    const dueOn = new Date(2026, 7, 15, 16, 0);

    expect(
      buildCreateTaskPayload(
        values({
          description: "  Produce three variants  ",
          taskStatusId: "status-id",
          typeOfWorkId: "type-id",
          parentTaskId: "parent-task-id",
          taskListId: "list-id",
          startOn,
          dueOn,
          plannedDuration: "1h 30m",
          isPrio: true,
        }),
      ),
    ).toEqual({
      name: "Create logo concept",
      baseType: "projecttask",
      entityId: "project-id",
      parentId: "parent-task-id",
      description: "Produce three variants",
      isPrio: true,
      startOn: "2026-08-11T00:00:00Z",
      dueOn: "2026-08-15T00:00:00Z",
      plannedDuration: 5400,
      typeOfWorkId: "type-id",
      taskStatusId: "status-id",
      lists: [{ id: "list-id" }],
    });
  });

  it("keeps the picked calendar day for dates at local midnight", () => {
    // With toISOString() a local midnight east of UTC would serialize as the previous day.
    const payload = buildCreateTaskPayload(values({ startOn: new Date(2026, 0, 1), dueOn: new Date(2026, 11, 31) }));

    expect(payload.startOn).toBe("2026-01-01T00:00:00Z");
    expect(payload.dueOn).toBe("2026-12-31T00:00:00Z");
  });

  it("builds a private task without a project or task list", () => {
    expect(
      buildCreateTaskPayload(
        values({
          projectId: "none",
          parentTaskId: "stale-parent-task-id",
          taskListId: "stale-project-list-id",
          taskStatusId: "private-status-id",
        }),
      ),
    ).toEqual({
      name: "Create logo concept",
      baseType: "private",
      isPrio: false,
      taskStatusId: "private-status-id",
    });
  });
});
