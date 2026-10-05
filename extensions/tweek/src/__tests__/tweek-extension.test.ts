import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyTaskFilters } from "../components/FilterBar";
import {
  getCachedCalendars,
  getCachedTasks,
  invalidateTaskCache,
  setCachedCalendars,
  setCachedTasks,
} from "../hooks/useTaskCache";
import { TaskFilterState, TweekTask } from "../types";
import {
  formatTaskDate,
  getWeekBoundsISO,
  isOverdue,
  parseQuickAddInput,
  parseVirtualTaskId,
} from "../utils/date-utils";
import {
  formatTaskMarkdown,
  getChecklistProgress,
  resolveTaskColor,
} from "../utils/format-task";
import {
  bulk_create_tasks,
  bulk_update_tasks,
  complete_task,
  create_task,
  delete_task,
  list_calendars,
  list_tasks,
  update_task,
} from "../utils/tweek-client";

describe("date-utils", () => {
  it("parses virtual occurrence IDs (<taskId>_yyyyMMdd)", () => {
    const virtual = parseVirtualTaskId("todo_9981_20260926");
    expect(virtual.isVirtual).toBe(true);
    expect(virtual.baseTaskId).toBe("todo_9981");
    expect(virtual.occurrenceDate).toBe("2026-09-26");

    const regular = parseVirtualTaskId("todo_9981");
    expect(regular.isVirtual).toBe(false);
    expect(regular.baseTaskId).toBe("todo_9981");
    expect(regular.occurrenceDate).toBeNull();
  });

  it("formats dates in dd/MM/yyyy and MM/dd/yyyy", () => {
    expect(formatTaskDate("2026-09-26", "dd/MM/yyyy")).toBe("26/09/2026");
    expect(formatTaskDate("2026-09-26", "MM/dd/yyyy")).toBe("09/26/2026");
    expect(formatTaskDate(null)).toBe("Someday");
  });

  it("calculates week bounds respecting Monday vs Sunday", () => {
    // 2026-09-26 is Saturday
    const refDate = new Date(2026, 8, 26, 12, 0, 0);
    const mondayBounds = getWeekBoundsISO(refDate, "Monday");
    expect(mondayBounds.startISO).toBe("2026-09-21");
    expect(mondayBounds.endISO).toBe("2026-09-27");

    const sundayBounds = getWeekBoundsISO(refDate, "Sunday");
    expect(sundayBounds.startISO).toBe("2026-09-20");
    expect(sundayBounds.endISO).toBe("2026-09-26");
  });

  it("parses inline Quick Add syntax (@tomorrow, @someday, #pink)", () => {
    const refDate = new Date(2026, 8, 26, 12, 0, 0);
    const parsed = parseQuickAddInput(
      "Ship Raycast Extension @tomorrow #pink",
      undefined,
      refDate,
    );
    expect(parsed.cleanText).toBe("Ship Raycast Extension");
    expect(parsed.date).toBe("2026-09-27");
    expect(parsed.color).toBe("pink");

    const somedayParsed = parseQuickAddInput(
      "Read design book @someday #yellowish",
      undefined,
      refDate,
    );
    expect(somedayParsed.cleanText).toBe("Read design book");
    expect(somedayParsed.date).toBeNull();
    expect(somedayParsed.color).toBe("yellowish");
  });

  it("correctly identifies overdue tasks", () => {
    const refDate = new Date(2026, 8, 26, 12, 0, 0);
    expect(isOverdue("2026-09-25", false, refDate)).toBe(true);
    expect(isOverdue("2026-09-25", true, refDate)).toBe(false);
    expect(isOverdue("2026-09-26", false, refDate)).toBe(false);
  });
});

describe("format-task", () => {
  it("resolves built-in and custom colors", () => {
    expect(resolveTaskColor("pink").hex).toBe("#CD2C54");
    expect(resolveTaskColor("yellowish").hex).toBe("#FDEF5D");
    const custom = resolveTaskColor("custom_1", [
      {
        id: "custom_1",
        color: "#FFFFFF",
        backgroundColor: "#123456",
        name: "Deep Navy",
      },
    ]);
    expect(custom.hex).toBe("#123456");
    expect(custom.label).toBe("Deep Navy");
  });

  it("computes checklist progress and formats Markdown details", () => {
    const task: TweekTask = {
      id: "t1_20260926",
      calendarId: "cal_1",
      text: "Prepare Release",
      done: false,
      date: "2026-09-26",
      color: "pink",
      freq: 2,
      virtual: true,
      note: "Check all unit tests",
      checklist: [
        { id: "s1", text: "Write tests", done: true },
        { id: "s2", text: "Run build", done: false },
      ],
    };

    const progress = getChecklistProgress(task);
    expect(progress?.label).toBe("1/2");

    const md = formatTaskMarkdown(task);
    expect(md).toContain("# Prepare Release");
    expect(md).toContain("Check all unit tests");
    expect(md).toContain("- [x] Write tests");
    expect(md).toContain("- [ ] Run build");
    expect(md).toContain("Virtual Occurrence");
  });
});

describe("FilterBar & applyTaskFilters", () => {
  const sampleTasks: TweekTask[] = [
    {
      id: "1",
      calendarId: "cal_1",
      text: "Fix production bug",
      done: false,
      date: "2026-09-25",
      color: "pink",
    },
    {
      id: "2",
      calendarId: "cal_1",
      text: "Team sync meeting",
      done: true,
      date: "2026-09-26",
      color: "yellowish",
    },
    {
      id: "3",
      calendarId: "cal_1",
      text: "Learn Rust",
      done: false,
      date: null,
      listId: "list_someday",
      color: "blank",
    },
  ];
  const refDate = new Date(2026, 8, 26, 12, 0, 0);

  it("filters by overdue, hideCompleted, color, and keyword", () => {
    const baseFilter: TaskFilterState = {
      searchText: "",
      calendarId: "cal_1",
      datePreset: "overdue",
      colorFilter: "all",
      hideCompleted: false,
      somedayListId: "all",
    };

    const overdueOnly = applyTaskFilters(
      sampleTasks,
      baseFilter,
      "Monday",
      refDate,
    );
    expect(overdueOnly).toHaveLength(1);
    expect(overdueOnly[0].id).toBe("1");

    const hideCompletedList = applyTaskFilters(
      sampleTasks,
      { ...baseFilter, datePreset: "all", hideCompleted: true },
      "Monday",
      refDate,
    );
    expect(hideCompletedList).toHaveLength(2);

    const keywordFiltered = applyTaskFilters(
      sampleTasks,
      { ...baseFilter, datePreset: "all", searchText: "rust" },
      "Monday",
      refDate,
    );
    expect(keywordFiltered).toHaveLength(1);
    expect(keywordFiltered[0].id).toBe("3");
  });
});

describe("useTaskCache", () => {
  beforeEach(() => {
    invalidateTaskCache();
  });

  it("stores and invalidates calendars and tasks", () => {
    setCachedCalendars([{ id: "cal_1", name: "Work", lists: [] }]);
    expect(getCachedCalendars()?.length).toBe(1);

    setCachedTasks(
      "cal_1",
      [
        {
          id: "t1",
          calendarId: "cal_1",
          text: "Demo",
          done: false,
          date: "2026-09-26",
        },
      ],
      "scopeA",
    );
    expect(getCachedTasks("cal_1", "scopeA")?.tasks).toHaveLength(1);

    invalidateTaskCache("cal_1");
    expect(getCachedTasks("cal_1", "scopeA")).toBeNull();
  });
});

describe("tweek-client MCP & REST operations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls list_calendars and list_tasks with expand=occurrences", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/calendars")) {
        return new Response(
          JSON.stringify([
            { id: "cal_1", name: "Personal", isDefault: true, lists: [] },
          ]),
          { status: 200 },
        );
      }
      if (url.includes("/tasks")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "t1_20260926",
                calendarId: "cal_1",
                text: "Standup",
                done: false,
                date: "2026-09-26",
                virtual: true,
              },
            ],
            nextDocId: null,
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const cals = await list_calendars("test_key");
    expect(cals).toHaveLength(1);
    expect(cals[0].name).toBe("Personal");

    const tasksRes = await list_tasks(
      { calendarId: "cal_1", dateFrom: "2026-09-20", dateTo: "2026-09-27" },
      {},
      "test_key",
    );
    expect(tasksRes.data).toHaveLength(1);
    expect(fetchMock.mock.calls[1][0]).toContain("expand=occurrences");
  });

  it("automatically falls back to Free plan defaults when create_task returns 400 Upgrade required", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            message: "Upgrade required: custom color needs a paid plan",
          }),
          { status: 400 },
        );
      }
      return new Response(JSON.stringify({ id: "created_free_1" }), {
        status: 200,
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const created = await create_task(
      {
        calendarId: "cal_1",
        text: "Test Fallback",
        date: "2026-09-26",
        color: "cornflower",
      },
      "test_key",
    );

    expect(created.id).toBe("created_free_1");
    expect(callCount).toBe(2);
  });

  it("supports recurring updateType and cross-calendar task move", async () => {
    const urlsCalled: string[] = [];
    const methodsCalled: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        urlsCalled.push(url);
        methodsCalled.push(init?.method || "GET");
        return new Response(
          JSON.stringify({ id: "migrated_task_99", text: "Moved" }),
          {
            status: 200,
          },
        );
      }),
    );

    await complete_task("task_1_20260926", true, "this_and_future", "test_key");
    expect(urlsCalled[0]).toContain("updateType=this_and_future");

    await delete_task("task_1_20260926", "only_this", "test_key");
    expect(urlsCalled[1]).toContain("updateType=only_this");

    // Cross-calendar migration
    const moved = await update_task(
      "task_old",
      {
        originalCalendarId: "cal_1",
        calendarId: "cal_2",
        text: "Moved to Work Calendar",
      },
      undefined,
      "test_key",
    );
    expect(moved.id).toBe("migrated_task_99");
    expect(methodsCalled).toContain("POST");
    expect(methodsCalled).toContain("DELETE");
  });

  it("handles bulk_create_tasks and bulk_update_tasks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        return new Response(JSON.stringify({ id: "bulk_id" }), { status: 200 });
      }),
    );

    const createRes = await bulk_create_tasks(
      [
        { calendarId: "cal_1", text: "Task A", date: "2026-09-26" },
        { calendarId: "cal_1", text: "Task B", date: "2026-09-26" },
      ],
      "test_key",
    );
    expect(createRes.succeeded).toHaveLength(2);
    expect(createRes.failed).toHaveLength(0);

    const updateRes = await bulk_update_tasks(
      [
        { taskId: "t1", done: true },
        { taskId: "t2", color: "pink" },
      ],
      "test_key",
    );
    expect(updateRes.succeeded).toHaveLength(2);
  });
});
