import { describe, expect, it } from "vitest";
import { groupMeetings, groupTasks, taskGroup } from "../src/dates";
import { messageForStatus } from "../src/errors";
import type { ScheduleItem, Task } from "../src/types";

function task(id: string, dueDate: string | null): Task {
  return {
    id,
    title: id,
    description: null,
    status: "todo",
    priority: "no_priority",
    dueDate,
    assignees: [],
    createdBy: "u1",
    estimatedTime: null,
    timeLogged: null,
    linkedMeetingIds: [],
    fileCount: 0,
    linkedRecordCount: 0,
    timerState: null,
    webUrl: `https://app.getkato.io/w/tasks/${id}/details`,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

function meeting(id: string, startTime: string, endTime: string): ScheduleItem {
  return {
    id,
    source: "meeting",
    title: id,
    startTime,
    endTime,
    isAllDay: false,
    status: "scheduled",
    detailLevel: "full",
    location: null,
    description: null,
    joinUrl: null,
    webUrl: `https://app.getkato.io/w/calendar?meetingId=${id}`,
    linkedMeetingId: id,
  };
}

describe("task grouping", () => {
  const now = new Date(2026, 7, 27, 12);

  it("groups local calendar dates without UTC boundary drift", () => {
    expect(taskGroup(task("overdue", new Date(2026, 7, 26, 23).toISOString()), now)).toBe("Overdue");
    expect(taskGroup(task("today", new Date(2026, 7, 27, 0).toISOString()), now)).toBe("Today");
    expect(taskGroup(task("future", new Date(2026, 7, 28, 0).toISOString()), now)).toBe("Upcoming");
    expect(taskGroup(task("none", null), now)).toBe("Unscheduled");
  });

  it("preserves every task exactly once", () => {
    const tasks = [task("a", null), task("b", new Date(2026, 7, 27).toISOString())];
    const grouped = groupTasks(tasks, now);
    expect(Object.values(grouped).flat().map((item) => item.id).sort()).toEqual(["a", "b"]);
  });
});

describe("meeting grouping", () => {
  it("separates happening-now, next, and tomorrow", () => {
    const now = new Date(2026, 7, 27, 12);
    const grouped = groupMeetings(
      [
        meeting("now", new Date(2026, 7, 27, 11, 30).toISOString(), new Date(2026, 7, 27, 12, 30).toISOString()),
        meeting("next", new Date(2026, 7, 27, 13).toISOString(), new Date(2026, 7, 27, 14).toISOString()),
        meeting("tomorrow", new Date(2026, 7, 28, 9).toISOString(), new Date(2026, 7, 28, 10).toISOString()),
      ],
      now,
    );
    expect(grouped["Happening Now"].map((item) => item.id)).toEqual(["now"]);
    expect(grouped.Next.map((item) => item.id)).toEqual(["next"]);
    expect(grouped.Tomorrow.map((item) => item.id)).toEqual(["tomorrow"]);
  });
});

describe("API error mapping", () => {
  it("gives actionable reconnect, permission, rate-limit, and offline messages", () => {
    expect(messageForStatus(401, undefined, "")).toContain("Reconnect");
    expect(messageForStatus(403, undefined, "")).toContain("denied");
    expect(messageForStatus(429, undefined, "")).toContain("too many");
    expect(messageForStatus(0, "offline", "Offline")).toBe("Offline");
  });
});
