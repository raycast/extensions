import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.mock("../api/oauth", () => ({
  client: {
    getTokens: vi.fn().mockResolvedValue({ accessToken: "test-token" }),
  },
}));

vi.mock("node-fetch", () => ({
  default: mockFetch,
}));

import { fetchLists, fetchList, createTask, editTask, deleteTask, toggleTask, parseApiDate, formatDueDate } from "../api/endpoints";

// Helper to create a mock Response
function mockResponse(data: unknown, ok = true, statusText = "OK") {
  return {
    ok,
    statusText,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Pure function tests ─────────────────────────────────────────────────────

describe("parseApiDate", () => {
  it("parses an RFC 3339 date string to local midnight Date", () => {
    const result = parseApiDate("2025-06-15T00:00:00.000Z");
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5); // June is month 5 (0-indexed)
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it("parses a date string without time portion correctly", () => {
    const result = parseApiDate("2024-01-01T12:30:00.000Z");
    // Should still use only the date part
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
  });

  it("handles single-digit months and days in the string", () => {
    const result = parseApiDate("2025-03-05T00:00:00.000Z");
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(5);
  });
});

describe("formatDueDate", () => {
  it("returns undefined for null input", () => {
    expect(formatDueDate(null)).toBeUndefined();
  });

  it("formats a Date to RFC 3339 string at midnight UTC", () => {
    // Create a date for June 15, 2025 in local time
    const date = new Date(2025, 5, 15); // June 15
    const result = formatDueDate(date);
    expect(result).toBe("2025-06-15T00:00:00.000Z");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2025, 0, 5); // January 5
    const result = formatDueDate(date);
    expect(result).toBe("2025-01-05T00:00:00.000Z");
  });

  it("handles December 31 correctly", () => {
    const date = new Date(2025, 11, 31); // December 31
    const result = formatDueDate(date);
    expect(result).toBe("2025-12-31T00:00:00.000Z");
  });

});

// ─── Timezone-specific tests ─────────────────────────────────────────────────

const TIMEZONES = [
  "UTC",                  // UTC+0
  "Europe/Paris",         // UTC+1 / UTC+2 (DST)
  "America/New_York",     // UTC-5 / UTC-4 (DST)
  "America/Los_Angeles",  // UTC-8 / UTC-7 (DST)
  "Asia/Tokyo",           // UTC+9 (no DST)
  "Pacific/Auckland",     // UTC+12 / UTC+13 (DST)
  "Asia/Kolkata",         // UTC+5:30 (half-hour offset)
];

/**
 * Helper: runs a callback under a specific TZ, then restores the original.
 * Node.js respects process.env.TZ for local Date methods.
 */
function withTimezone(tz: string, fn: () => void) {
  const originalTZ = process.env.TZ;
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    if (originalTZ === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTZ;
    }
  }
}

describe("formatDueDate across timezones", () => {
  for (const tz of TIMEZONES) {
    it(`preserves local date June 15 in ${tz}`, () => {
      withTimezone(tz, () => {
        // new Date(year, month, day) creates LOCAL midnight in whatever TZ is active
        const date = new Date(2025, 5, 15);
        const result = formatDueDate(date);
        expect(result).toBe("2025-06-15T00:00:00.000Z");
      });
    });

    it(`preserves local date Jan 1 in ${tz}`, () => {
      withTimezone(tz, () => {
        const date = new Date(2025, 0, 1);
        const result = formatDueDate(date);
        expect(result).toBe("2025-01-01T00:00:00.000Z");
      });
    });

    it(`preserves local date Dec 31 in ${tz}`, () => {
      withTimezone(tz, () => {
        const date = new Date(2025, 11, 31);
        const result = formatDueDate(date);
        expect(result).toBe("2025-12-31T00:00:00.000Z");
      });
    });
  }
});

describe("parseApiDate across timezones", () => {
  for (const tz of TIMEZONES) {
    it(`parses 2025-06-15 to local June 15 midnight in ${tz}`, () => {
      withTimezone(tz, () => {
        const result = parseApiDate("2025-06-15T00:00:00.000Z");
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(5);
        expect(result.getDate()).toBe(15);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
      });
    });

    it(`parses 2025-01-01 to local Jan 1 midnight in ${tz}`, () => {
      withTimezone(tz, () => {
        const result = parseApiDate("2025-01-01T00:00:00.000Z");
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(1);
        expect(result.getHours()).toBe(0);
      });
    });

    it(`ignores time portion in ${tz}`, () => {
      withTimezone(tz, () => {
        const result = parseApiDate("2025-06-15T23:59:59.999Z");
        expect(result.getDate()).toBe(15);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
      });
    });
  }
});

describe("formatDueDate <-> parseApiDate roundtrip across timezones", () => {
  const dateCases = [
    { year: 2025, month: 5, day: 15, label: "June 15" },
    { year: 2025, month: 0, day: 1, label: "Jan 1" },
    { year: 2025, month: 11, day: 31, label: "Dec 31" },
    { year: 2024, month: 1, day: 29, label: "Feb 29 (leap year)" },
  ];

  for (const tz of TIMEZONES) {
    for (const { year, month, day, label } of dateCases) {
      it(`roundtrips ${label} in ${tz}`, () => {
        withTimezone(tz, () => {
          const original = new Date(year, month, day);
          const formatted = formatDueDate(original)!;
          const parsed = parseApiDate(formatted);

          expect(parsed.getFullYear()).toBe(year);
          expect(parsed.getMonth()).toBe(month);
          expect(parsed.getDate()).toBe(day);
          expect(parsed.getHours()).toBe(0);
        });
      });
    }
  }
});

// ─── API function tests ──────────────────────────────────────────────────────

describe("fetchLists", () => {
  it("fetches task lists and returns id/title pairs", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({
        items: [
          { id: "list-1", title: "My Tasks", extra: "ignored" },
          { id: "list-2", title: "Work", extra: "ignored" },
        ],
      }),
    );

    const result = await fetchLists();

    expect(result).toEqual([
      { id: "list-1", title: "My Tasks" },
      { id: "list-2", title: "Work" },
    ]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue(mockResponse({}, false, "Unauthorized"));

    await expect(fetchLists()).rejects.toThrow("Unauthorized");
  });
});

describe("fetchList", () => {
  const makeFetchListTasks = (tasks: unknown[]) =>
    mockResponse({ items: tasks });

  it("fetches tasks and sorts open tasks by due date (earliest first)", async () => {
    mockFetch.mockResolvedValue(
      makeFetchListTasks([
        { id: "1", title: "Later", status: "needsAction", due: "2025-06-20T00:00:00.000Z" },
        { id: "2", title: "Sooner", status: "needsAction", due: "2025-06-10T00:00:00.000Z" },
        { id: "3", title: "Middle", status: "needsAction", due: "2025-06-15T00:00:00.000Z" },
      ]),
    );

    const result = await fetchList("list-1");
    expect(result.map((t) => t.title)).toEqual(["Sooner", "Middle", "Later"]);
  });

  it("sorts completed tasks by completion date (most recent first)", async () => {
    mockFetch.mockResolvedValue(
      makeFetchListTasks([
        { id: "1", title: "Old", status: "completed", completed: "2025-06-01T00:00:00.000Z" },
        { id: "2", title: "Recent", status: "completed", completed: "2025-06-15T00:00:00.000Z" },
        { id: "3", title: "Middle", status: "completed", completed: "2025-06-10T00:00:00.000Z" },
      ]),
    );

    const result = await fetchList("list-1", true);
    expect(result.map((t) => t.title)).toEqual(["Recent", "Middle", "Old"]);
  });

  it("puts tasks with due dates before those without", async () => {
    mockFetch.mockResolvedValue(
      makeFetchListTasks([
        { id: "1", title: "No Due", status: "needsAction" },
        { id: "2", title: "Has Due", status: "needsAction", due: "2025-06-15T00:00:00.000Z" },
      ]),
    );

    const result = await fetchList("list-1");
    expect(result.map((t) => t.title)).toEqual(["Has Due", "No Due"]);
  });

  it("passes showCompleted=false by default", async () => {
    mockFetch.mockResolvedValue(makeFetchListTasks([]));

    await fetchList("list-1");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("showCompleted=false");
  });

  it("passes showCompleted=true when requested", async () => {
    mockFetch.mockResolvedValue(makeFetchListTasks([]));

    await fetchList("list-1", true);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("showCompleted=true");
  });

  it("preserves order for tasks both without due dates", async () => {
    mockFetch.mockResolvedValue(
      makeFetchListTasks([
        { id: "1", title: "First", status: "needsAction" },
        { id: "2", title: "Second", status: "needsAction" },
      ]),
    );

    const result = await fetchList("list-1");
    expect(result.map((t) => t.title)).toEqual(["First", "Second"]);
  });

  it("handles completed tasks without completion date", async () => {
    mockFetch.mockResolvedValue(
      makeFetchListTasks([
        { id: "1", title: "No Date", status: "completed" },
        { id: "2", title: "Has Date", status: "completed", completed: "2025-06-15T00:00:00.000Z" },
      ]),
    );

    const result = await fetchList("list-1", true);
    // "Has Date" has a timestamp, "No Date" has 0 — so Has Date comes first
    expect(result.map((t) => t.title)).toEqual(["Has Date", "No Date"]);
  });

  it("strips extra fields from API response items", async () => {
    mockFetch.mockResolvedValue(
      makeFetchListTasks([
        { id: "1", title: "Task", status: "needsAction", extraField: "should be removed", position: "00001" },
      ]),
    );

    const result = await fetchList("list-1");
    expect(result[0]).toEqual({
      id: "1",
      title: "Task",
      status: "needsAction",
      due: undefined,
      completed: undefined,
      parent: undefined,
      notes: undefined,
    });
  });

  it("includes maxResults=100 and showHidden=true in query params", async () => {
    mockFetch.mockResolvedValue(makeFetchListTasks([]));

    await fetchList("list-1");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("maxResults=100");
    expect(calledUrl).toContain("showHidden=true");
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue(mockResponse({}, false, "Not Found"));

    await expect(fetchList("list-1")).rejects.toThrow("Not Found");
  });
});

describe("createTask", () => {
  it("sends POST with correct payload", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await createTask("list-1", {
      title: "New Task",
      notes: "Some notes",
      due: new Date(2025, 5, 15), // June 15
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "New Task",
          notes: "Some notes",
          due: "2025-06-15T00:00:00.000Z",
        }),
      }),
    );
  });

  it("sends undefined due when date is null", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await createTask("list-1", {
      title: "No Due Date",
      due: null,
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(body.title).toBe("No Due Date");
    expect(body.due).toBeUndefined();
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue(mockResponse({}, false, "Bad Request"));

    await expect(
      createTask("list-1", { title: "Fail", due: null }),
    ).rejects.toThrow("Bad Request");
  });
});

describe("deleteTask", () => {
  it("sends DELETE to correct URL", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await deleteTask("list-1", "task-42");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks/task-42",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue(mockResponse({}, false, "Forbidden"));

    await expect(deleteTask("list-1", "task-42")).rejects.toThrow("Forbidden");
  });
});

describe("editTask", () => {
  it("sends PATCH with formatted due date when due is a Date object", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    const task = {
      id: "task-1",
      title: "Edited",
      status: "needsAction",
      due: new Date(2025, 5, 15) as unknown as string, // runtime: Date from DatePicker
      notes: "Updated notes",
    };

    await editTask("list-1", task);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks/task-1",
      expect.objectContaining({
        method: "PATCH",
      }),
    );

    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(body.due).toBe("2025-06-15T00:00:00.000Z");
  });

  it("passes through string due date as-is", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    const task = {
      id: "task-1",
      title: "Edited",
      status: "needsAction",
      due: "2025-06-15T00:00:00.000Z",
    };

    await editTask("list-1", task);

    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(body.due).toBe("2025-06-15T00:00:00.000Z");
  });

  it("sets due to undefined when task has no due date", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await editTask("list-1", {
      id: "task-1",
      title: "No Due",
      status: "needsAction",
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(body.due).toBeUndefined();
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue(mockResponse({}, false, "Server Error"));

    await expect(
      editTask("list-1", { id: "1", title: "Fail", status: "needsAction" }),
    ).rejects.toThrow("Server Error");
  });
});

describe("toggleTask", () => {
  it("sets status to completed for an open task", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await toggleTask("list-1", {
      id: "task-1",
      title: "Open Task",
      status: "needsAction",
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(body.status).toBe("completed");
  });

  it("sets status to needsAction for a completed task", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await toggleTask("list-1", {
      id: "task-1",
      title: "Done Task",
      status: "completed",
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(body.status).toBe("needsAction");
  });

  it("sends PATCH to correct URL", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await toggleTask("list-1", {
      id: "task-1",
      title: "Task",
      status: "needsAction",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks/task-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue(mockResponse({}, false, "Unauthorized"));

    await expect(
      toggleTask("list-1", { id: "1", title: "Fail", status: "needsAction" }),
    ).rejects.toThrow("Unauthorized");
  });
});
