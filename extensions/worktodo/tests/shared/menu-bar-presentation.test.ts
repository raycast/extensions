import { describe, expect, it } from "vitest";
import type { Project, Task } from "../../src/shared/domain/model";
import type { ThisWeekResult } from "../../src/shared/domain/queries";
import {
  buildMenuBarModel,
  buildMenuBarTaskHistoryItem,
  menuBarTaskTitle,
  resolveMenuBarVisibility,
} from "../../src/shared/presentation/menu-bar";
import { parseMyTasksLaunchContext } from "../../src/shared/presentation/task-launch";

function task(id: string, title: string, priority: boolean, projectId: string | null = null): Task {
  return {
    id,
    title,
    notes: "",
    priority,
    position: 1_024,
    projectId,
    labelIds: [],
    due: { kind: "allDay", date: "2026-08-30" },
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
    completedAtMs: null,
    trashedAtMs: null,
  };
}

function thisWeekResult(tasks: ThisWeekResult["tasks"], localDate = "2026-08-31"): ThisWeekResult {
  return {
    tasks,
    count: tasks.length,
    localDate,
    startOfDayMs: 1_000,
    startOfNextDayMs: 2_000,
    endOfWeekDate: "2026-09-06",
    startOfNextWeekMs: 3_000,
  };
}

function project(id: string, name: string): Project {
  return { id, name, position: 1_024, createdAtMs: 1_000, updatedAtMs: 1_000 };
}

describe("menu-bar presentation", () => {
  it("shows priority tasks first once, preserves due order, and counts overdue and today tasks", () => {
    const work = project("project-1", "Work");
    const overduePriority = task("1", "Submit report", true, work.id);
    const overdue = task("2", "Book appointment", false);
    const dueToday = task("3", "Buy groceries", false);
    const dueTomorrow = task("4", "Review proposal", false, work.id);
    const dueFriday = task("5", "Plan launch", true, work.id);

    expect(
      buildMenuBarModel(
        thisWeekResult([
          { task: overduePriority, status: "overdue", localDate: "2026-08-30", effectiveDueAtMs: 1_000 },
          { task: overdue, status: "overdue", localDate: "2026-08-30", effectiveDueAtMs: 1_100 },
          { task: dueToday, status: "dueToday", localDate: "2026-08-31", effectiveDueAtMs: 1_200 },
          { task: dueTomorrow, status: "laterThisWeek", localDate: "2026-09-01", effectiveDueAtMs: 2_000 },
          { task: dueFriday, status: "laterThisWeek", localDate: "2026-09-04", effectiveDueAtMs: 3_000 },
        ]),
        [work],
      ),
    ).toEqual({
      count: 3,
      title: "3",
      sections: [
        {
          key: "priority",
          title: "Priority",
          tasks: [
            {
              id: "1",
              title: "Submit report",
              priority: true,
              projectName: "Work",
              dueLabel: "Overdue",
              view: "thisWeek",
            },
            {
              id: "5",
              title: "Plan launch",
              priority: true,
              projectName: "Work",
              dueLabel: "Fri",
              view: "thisWeek",
            },
          ],
        },
        {
          key: "overdue",
          title: "Overdue",
          tasks: [
            {
              id: "2",
              title: "Book appointment",
              priority: false,
              projectName: null,
              dueLabel: null,
              view: "thisWeek",
            },
          ],
        },
        {
          key: "today",
          title: "Today",
          tasks: [
            {
              id: "3",
              title: "Buy groceries",
              priority: false,
              projectName: null,
              dueLabel: null,
              view: "thisWeek",
            },
          ],
        },
        {
          key: "tomorrow",
          title: "Tomorrow",
          tasks: [
            {
              id: "4",
              title: "Review proposal",
              priority: false,
              projectName: "Work",
              dueLabel: null,
              view: "thisWeek",
            },
          ],
        },
      ],
    });
  });

  it("keeps a priority-only menu and labels tasks due today or tomorrow", () => {
    const dueToday = task("1", "Review notes", true);
    const dueTomorrow = task("2", "Send proposal", true);

    expect(
      buildMenuBarModel(
        thisWeekResult([
          { task: dueToday, status: "dueToday", localDate: "2026-08-31", effectiveDueAtMs: 1_000 },
          { task: dueTomorrow, status: "laterThisWeek", localDate: "2026-09-01", effectiveDueAtMs: 2_000 },
        ]),
        [],
      ),
    ).toEqual({
      count: 1,
      title: "1",
      sections: [
        {
          key: "priority",
          title: "Priority",
          tasks: [
            { id: "1", title: "Review notes", priority: true, projectName: null, dueLabel: "Today", view: "thisWeek" },
            {
              id: "2",
              title: "Send proposal",
              priority: true,
              projectName: null,
              dueLabel: "Tomorrow",
              view: "thisWeek",
            },
          ],
        },
      ],
    });
  });

  it("hides the menu title and task sections when nothing is due", () => {
    expect(buildMenuBarModel(thisWeekResult([]), [])).toEqual({
      count: 0,
      title: undefined,
      sections: [],
    });
  });

  it("does not include later-this-week tasks in the menu title count", () => {
    const tomorrow = task("1", "Review proposal", false);

    expect(
      buildMenuBarModel(
        thisWeekResult([{ task: tomorrow, status: "laterThisWeek", localDate: "2026-09-01", effectiveDueAtMs: 2_000 }]),
        [],
      ),
    ).toEqual({
      count: 0,
      title: undefined,
      sections: [
        {
          key: "tomorrow",
          title: "Tomorrow",
          tasks: [
            {
              id: "1",
              title: "Review proposal",
              priority: false,
              projectName: null,
              dueLabel: null,
              view: "thisWeek",
            },
          ],
        },
      ],
    });
  });

  it("keeps project names out of the main task label", () => {
    const baseTask = {
      id: "task-1",
      title: "Submit report",
      priority: true,
      dueLabel: null,
      view: "thisWeek" as const,
    };
    expect(menuBarTaskTitle({ ...baseTask, projectName: "Work" })).toBe("Submit report");
    expect(menuBarTaskTitle({ ...baseTask, projectName: null })).toBe("Submit report");
  });

  it("keeps task labels at the limit and truncates labels that exceed it", () => {
    const baseTask = {
      id: "task-1",
      priority: true,
      projectName: null,
      dueLabel: null,
      view: "thisWeek" as const,
    };
    const exactTitle = "a".repeat(72);

    expect(menuBarTaskTitle({ ...baseTask, title: exactTitle })).toBe(exactTitle);
    expect(menuBarTaskTitle({ ...baseTask, title: `${exactTitle}a` })).toBe(`${"a".repeat(71)}…`);
  });

  it("truncates a long task title without reserving space for its project", () => {
    expect(
      menuBarTaskTitle({
        id: "task-1",
        title: "a".repeat(100),
        priority: true,
        projectName: "Work",
        dueLabel: null,
        view: "thisWeek",
      }),
    ).toBe(`${"a".repeat(71)}…`);
  });

  it("does not let long project names consume the task label budget", () => {
    expect(
      menuBarTaskTitle({
        id: "task-1",
        title: "a".repeat(100),
        priority: true,
        projectName: "p".repeat(30),
        dueLabel: null,
        view: "thisWeek",
      }),
    ).toBe(`${"a".repeat(71)}…`);
  });

  it("preserves the due label within the task label limit", () => {
    const priorityTask = {
      id: "task-1",
      title: "a".repeat(100),
      priority: true,
      projectName: "Work",
      dueLabel: "Overdue",
      view: "thisWeek" as const,
    };

    expect(menuBarTaskTitle(priorityTask)).toBe(`${"a".repeat(61)}… · Overdue`);
    expect(menuBarTaskTitle({ ...priorityTask, title: "Submit report", projectName: null, dueLabel: "Today" })).toBe(
      "Submit report · Today",
    );
  });

  it("does not split composed emoji when truncating task labels", () => {
    const family = "👨‍👩‍👧‍👦";

    expect(
      menuBarTaskTitle({
        id: "task-1",
        title: family.repeat(73),
        priority: true,
        projectName: null,
        dueLabel: null,
        view: "thisWeek",
      }),
    ).toBe(`${family.repeat(71)}…`);
  });

  it("accepts only supported All tasks launch context values", () => {
    expect(parseMyTasksLaunchContext({ view: "all" })).toEqual({
      view: "all",
      selectedTaskId: undefined,
      createTask: false,
      editTask: false,
      isShowingDetail: false,
    });
    expect(parseMyTasksLaunchContext({ view: "thisWeek", selectedTaskId: "task-1", createTask: true })).toEqual({
      view: "thisWeek",
      selectedTaskId: "task-1",
      createTask: true,
      editTask: false,
      isShowingDetail: true,
    });
    expect(
      parseMyTasksLaunchContext({ view: "project", selectedTaskId: "", createTask: "yes", editTask: "yes" }),
    ).toEqual({
      view: "all",
      selectedTaskId: undefined,
      createTask: false,
      editTask: false,
      isShowingDetail: false,
    });
    expect(parseMyTasksLaunchContext(null)).toEqual({
      view: "all",
      selectedTaskId: undefined,
      createTask: false,
      editTask: false,
      isShowingDetail: false,
    });
  });

  it("accepts edit intent only with a selected task and without create intent", () => {
    expect(parseMyTasksLaunchContext({ view: "today", selectedTaskId: "task-1", editTask: true })).toEqual({
      view: "today",
      selectedTaskId: "task-1",
      createTask: false,
      editTask: true,
      isShowingDetail: true,
    });
    expect(parseMyTasksLaunchContext({ view: "today", editTask: true })).toMatchObject({ editTask: false });
    expect(parseMyTasksLaunchContext({ selectedTaskId: "task-1", createTask: true, editTask: true })).toMatchObject({
      createTask: true,
      editTask: false,
    });
  });

  it("keeps a stored hidden state during background refresh", () => {
    expect(resolveMenuBarVisibility(true, false)).toEqual({ hidden: true, clearStoredHidden: false });
  });

  it("restores a hidden item when the user launches the command", () => {
    expect(resolveMenuBarVisibility(true, true)).toEqual({ hidden: false, clearStoredHidden: true });
    expect(resolveMenuBarVisibility(false, true)).toEqual({ hidden: false, clearStoredHidden: false });
  });

  it("presents the current menu-bar Undo or Redo with its task title", () => {
    expect(
      buildMenuBarTaskHistoryItem({
        direction: "undo",
        kind: "complete",
        taskId: "task-1",
        taskTitle: "Submit report",
      }),
    ).toEqual({ direction: "undo", title: "Undo Completion", subtitle: "Submit report" });
    expect(
      buildMenuBarTaskHistoryItem({
        direction: "redo",
        kind: "complete",
        taskId: "task-1",
        taskTitle: "Submit report",
      }),
    ).toEqual({ direction: "redo", title: "Redo Completion", subtitle: "Submit report" });
  });

  it("truncates a long Undo or Redo task title within the menu label budget", () => {
    expect(
      buildMenuBarTaskHistoryItem({
        direction: "undo",
        kind: "trash",
        taskId: "task-1",
        taskTitle: "a".repeat(100),
      }),
    ).toEqual({
      direction: "undo",
      title: "Undo Move to Trash",
      subtitle: `${"a".repeat(52)}…`,
    });
  });
});
