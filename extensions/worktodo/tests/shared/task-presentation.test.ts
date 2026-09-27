import { describe, expect, it } from "vitest";
import { taskLifecycleActionKindForViewKind } from "../../src/shared/application/task-lifecycle-interaction";
import type { Label, Project, Task } from "../../src/shared/domain/model";
import { MAX_REPRESENTABLE_TIMESTAMP_MS } from "../../src/shared/domain/validation";
import { taskLifecycleMutationPresentation } from "../../src/shared/presentation/task-lifecycle";
import {
  buildAllTaskListSections,
  buildTaskListItems,
  extractTaskNoteLinks,
  taskListRowPresentation,
  taskNotesMarkdown,
} from "../../src/shared/presentation/task-list";
import { buildTaskViewSections, taskViewContent } from "../../src/shared/presentation/task-views";

const project: Project = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Personal",
  position: 1_024,
  createdAtMs: 1_000,
  updatedAtMs: 1_000,
};
const labels: Label[] = ["Waiting", "High Impact", "Next", "Deep Work"].map((name, index) => ({
  id: `label-${index + 1}`,
  name,
  position: (index + 1) * 1_024,
  createdAtMs: 1_000,
  updatedAtMs: 1_000,
}));
function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "00000000-0000-4000-8000-000000000003",
    title: "Review plan",
    notes: "Open the planning workspace",
    priority: true,
    position: 1_024,
    projectId: project.id,
    labelIds: [],
    due: { kind: "allDay", date: "2026-10-04" },
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
    completedAtMs: null,
    trashedAtMs: null,
    ...overrides,
  };
}

describe("task presentation mapping", () => {
  it("uses concise search and empty-state copy", () => {
    expect(taskViewContent({ kind: "all" }, [], [])).toEqual({
      title: "All tasks",
      searchPlaceholder: "Search tasks",
      emptyTitle: "No tasks yet",
      emptyDescription: "Create a task to get started.",
    });
    expect(taskViewContent({ kind: "today" }, [], [])).toMatchObject({
      searchPlaceholder: "Search today's tasks",
      emptyTitle: "Nothing due today",
      emptyDescription: "Overdue tasks also appear here.",
    });
    expect(taskViewContent({ kind: "thisWeek" }, [], [])).toMatchObject({
      title: "This week",
      searchPlaceholder: "Search this week's tasks",
      emptyTitle: "Nothing due this week",
    });
  });

  it("groups This week into overdue, today, and later dates", () => {
    const overdue = task({ id: "overdue", due: { kind: "allDay", date: "2026-08-30" } });
    const today = task({ id: "today", due: { kind: "allDay", date: "2026-08-31" } });
    const tomorrow = task({ id: "tomorrow", due: { kind: "allDay", date: "2026-09-01" } });
    const sections = buildTaskViewSections(
      {
        kind: "thisWeek",
        view: { kind: "thisWeek" },
        evaluatedAtMs: 1_000,
        viewerTimeZone: "Australia/Melbourne",
        result: {
          tasks: [
            { task: overdue, status: "overdue", localDate: "2026-08-30", effectiveDueAtMs: 1_000 },
            { task: today, status: "dueToday", localDate: "2026-08-31", effectiveDueAtMs: 2_000 },
            { task: tomorrow, status: "laterThisWeek", localDate: "2026-09-01", effectiveDueAtMs: 3_000 },
          ],
          count: 3,
          localDate: "2026-08-31",
          startOfDayMs: 1_000,
          startOfNextDayMs: 2_000,
          endOfWeekDate: "2026-09-06",
          startOfNextWeekMs: 4_000,
        },
      },
      [project],
      [],
    );

    expect(sections.map((section) => [section.key, section.title, section.items.map((item) => item.id)])).toEqual([
      ["thisWeek:overdue", "Overdue", [overdue.id]],
      ["thisWeek:today", "Today", [today.id]],
      ["thisWeek:2026-09-01", "Tomorrow", [tomorrow.id]],
    ]);
  });

  it("groups All tasks under No project and non-empty projects in project order", () => {
    const work: Project = { ...project, id: "work", name: "Work", position: 2_048 };
    const empty: Project = { ...project, id: "empty", name: "Empty", position: 3_072 };
    const noProjectTask = task({ id: "no-project", projectId: null });
    const workTask = task({ id: "work-task", projectId: work.id });
    const directPersonalTask = task({ id: "personal-direct" });
    const secondPersonalTask = task({ id: "personal-second" });

    const groups = buildAllTaskListSections(
      [noProjectTask, workTask, directPersonalTask, secondPersonalTask],
      [work, empty, project],
      [],
      "Australia/Melbourne",
    );

    expect(groups.map(({ key, title }) => ({ key, title }))).toEqual([
      { key: "all:no-project", title: "No project" },
      { key: "all:project:work", title: "Work" },
      { key: `all:project:${project.id}`, title: "Personal" },
    ]);
    expect(groups.map((group) => group.items.map((item) => [item.id, item.subtitle]))).toEqual([
      [["no-project", undefined]],
      [["work-task", "Work"]],
      [
        ["personal-direct", "Personal"],
        ["personal-second", "Personal"],
      ],
    ]);
  });

  it("preserves query order and adds an explicit priority tag", () => {
    const first = task();
    const second = task({
      id: "00000000-0000-4000-8000-000000000004",
      title: "No-project task",
      projectId: null,
      priority: false,
      due: { kind: "none" },
    });
    const items = buildTaskListItems(
      [{ task: first, todayStatus: "overdue" }, { task: second }],
      [project],
      [],
      "Australia/Melbourne",
    );
    expect(items.map((item) => item.id)).toEqual([first.id, second.id]);
    expect(items[0]).toMatchObject({
      subtitle: "Personal",
      accessories: [
        { kind: "tag", text: "Priority", style: "priority" },
        { kind: "text", text: "Overdue 2026-10-04" },
      ],
      keywords: ["Personal", "Open the planning workspace"],
    });
    expect(items[1]).toMatchObject({ subtitle: undefined, accessories: [] });
  });

  it("builds deterministic detail metadata for every project and due kind", () => {
    const timedAtMs = Date.parse("2026-10-04T02:30:00.000Z");
    const timedLabel = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Australia/Melbourne",
    }).format(new Date(timedAtMs));
    const sourceTasks = [
      task({
        id: "00000000-0000-4000-8000-000000000010",
        projectId: null,
        priority: false,
        due: { kind: "none" },
      }),
      task({
        id: "00000000-0000-4000-8000-000000000011",
        projectId: project.id,
        priority: true,
        due: { kind: "allDay", date: "2026-10-04" },
      }),
      task({
        id: "00000000-0000-4000-8000-000000000012",
        priority: false,
        due: { kind: "timed", instantMs: timedAtMs, timeZone: "Australia/Melbourne" },
      }),
    ];
    const before = structuredClone(sourceTasks);
    const entries = [
      { task: sourceTasks[0] },
      { task: sourceTasks[1], todayStatus: "overdue" as const },
      { task: sourceTasks[2], todayStatus: "dueToday" as const },
    ];

    const first = buildTaskListItems(entries, [project], [], "Australia/Melbourne");
    const second = buildTaskListItems(entries, [project], [], "Australia/Melbourne");

    expect(first.map((item) => item.detail.metadata.slice(0, 3))).toEqual([
      [
        { title: "Project", text: "No project" },
        { title: "Priority", text: "No" },
        { title: "Due date", text: "None" },
      ],
      [
        { title: "Project", text: "Personal" },
        { title: "Priority", text: "Yes" },
        { title: "Overdue", text: "2026-10-04" },
      ],
      [
        { title: "Project", text: "Personal" },
        { title: "Priority", text: "No" },
        { title: "Today", text: timedLabel },
      ],
    ]);
    expect(second.map((item) => item.detail)).toEqual(first.map((item) => item.detail));
    expect(sourceTasks).toEqual(before);
  });

  it("renders the maximum representable task timestamp", () => {
    expect(() =>
      buildTaskListItems(
        [
          {
            task: task({
              due: { kind: "timed", instantMs: MAX_REPRESENTABLE_TIMESTAMP_MS, timeZone: "UTC" },
              createdAtMs: MAX_REPRESENTABLE_TIMESTAMP_MS,
              updatedAtMs: MAX_REPRESENTABLE_TIMESTAMP_MS,
            }),
          },
        ],
        [project],
        [],
        "UTC",
      ),
    ).not.toThrow();
  });

  it("renders notes literally and extracts distinct valid web links", () => {
    const notes = "# Heading\n- [ ] Use *literal* text\n[Docs](https://example.com/path).";
    expect(taskNotesMarkdown(notes)).toBe(
      "## Notes\n\n\\# Heading  \n\\- \\[ \\] Use \\*literal\\* text  \n\\[Docs\\]\\(https\\:\\/\\/example\\.com\\/path\\)\\.",
    );
    expect(taskNotesMarkdown("")).toBe("## Notes\n\n_No notes_");
    expect(
      extractTaskNoteLinks(
        "https://example.com/path, HTTPS://EXAMPLE.COM/path. https://example.org/a_(b). https://? http://localhost:8080/test ftp://example.net",
      ),
    ).toEqual(["https://example.com/path", "https://example.org/a_(b)", "http://localhost:8080/test"]);
  });

  it.each([
    [[], []],
    [[labels[0].id], [{ kind: "tag", text: "Waiting" }]],
    [
      [labels[0].id, labels[1].id],
      [
        { kind: "tag", text: "Waiting" },
        { kind: "tag", text: "High Impact" },
      ],
    ],
    [
      labels.map((label) => label.id),
      [
        { kind: "tag", text: "Waiting" },
        { kind: "tag", text: "High Impact" },
        { kind: "text", text: "+2" },
      ],
    ],
  ])("shows a bounded row summary for %s Labels and every Label in details", (labelIds, accessories) => {
    const [item] = buildTaskListItems(
      [{ task: task({ priority: false, due: { kind: "none" }, labelIds }) }],
      [project],
      labels,
      "Australia/Melbourne",
    );

    expect(item.accessories).toEqual(accessories);
    expect(item.detail.labels).toEqual(
      labels.filter((label) => labelIds.includes(label.id)).map((label) => label.name),
    );
    expect(item.keywords).toEqual([
      "Personal",
      "Open the planning workspace",
      ...labels.filter((label) => labelIds.includes(label.id)).map((label) => label.name),
    ]);
  });

  it("maps lifecycle actions for safe secondary views", () => {
    for (const viewKind of ["all", "today", "thisWeek", "project"]) {
      const kind = taskLifecycleActionKindForViewKind(viewKind);
      expect({ kind, ...taskLifecycleMutationPresentation(kind) }).toEqual({
        kind: "complete",
        title: "Complete Task",
        successTitle: "Task completed",
        failureTitle: "Unable to complete task",
      });
    }
    const reopen = taskLifecycleActionKindForViewKind("completed");
    expect({ kind: reopen, ...taskLifecycleMutationPresentation(reopen) }).toEqual({
      kind: "reopen",
      title: "Reopen Task",
      successTitle: "Task reopened",
      failureTitle: "Unable to reopen task",
    });
    const restore = taskLifecycleActionKindForViewKind("trash");
    expect({ kind: restore, ...taskLifecycleMutationPresentation(restore) }).toEqual({
      kind: "restore",
      title: "Restore Task",
      successTitle: "Task restored",
      failureTitle: "Unable to restore task",
    });
  });

  it("shows completion acknowledgement without changing the task title or source item", () => {
    const source = task({ priority: true, due: { kind: "none" } });
    const [item] = buildTaskListItems([{ task: source }], [], [], "Australia/Melbourne");
    const before = structuredClone(item);
    const completed = { ...source, completedAtMs: 2_000, updatedAtMs: 2_000 };

    expect(taskListRowPresentation(item, completed)).toEqual({
      title: source.title,
      accessories: [{ kind: "text", text: "Completed" }],
      isCompletionAcknowledged: true,
    });
    expect(taskListRowPresentation(item, undefined)).toEqual({
      title: source.title,
      accessories: [{ kind: "tag", text: "Priority", style: "priority" }],
      isCompletionAcknowledged: false,
    });
    expect(item).toEqual(before);
    expect(source.completedAtMs).toBeNull();
  });

  it("shows independent completion and trash timestamps", () => {
    const completedAtMs = Date.parse("2026-10-04T01:00:00.000Z");
    const trashedAtMs = Date.parse("2026-10-04T02:00:00.000Z");
    const format = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Australia/Melbourne",
    });
    const [item] = buildTaskListItems(
      [
        {
          task: task({
            priority: false,
            due: { kind: "none" },
            completedAtMs,
            trashedAtMs,
          }),
        },
      ],
      [project],
      [],
      "Australia/Melbourne",
    );

    expect(item.accessories).toEqual([
      { kind: "text", text: `Completed ${format.format(new Date(completedAtMs))}` },
      { kind: "text", text: `Trashed ${format.format(new Date(trashedAtMs))}` },
    ]);
    expect(item.detail.metadata).toEqual([
      { title: "Project", text: "Personal" },
      { title: "Priority", text: "No" },
      { title: "Due date", text: "None" },
      { title: "Created", text: format.format(new Date(1_000)) },
      { title: "Updated", text: format.format(new Date(1_000)) },
      { title: "Completed", text: format.format(new Date(completedAtMs)) },
      { title: "Trashed", text: format.format(new Date(trashedAtMs)) },
    ]);
  });
});
