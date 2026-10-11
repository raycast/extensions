import { describe, expect, it } from "vitest";
import { createMenuBarModel } from "../src/menu-bar-model";
import type {
  DailyBrief,
  KatoNotification,
  ScheduleItem,
  Task,
} from "../src/types";

function task(
  id: string,
  dueDate: string,
  priority: Task["priority"] = "no_priority",
): Task {
  return {
    id,
    title: id,
    description: null,
    status: "todo",
    priority,
    dueDate,
    assignees: [],
    createdBy: "u1",
    estimatedTime: null,
    timeLogged: null,
    linkedMeetingIds: [],
    fileCount: 0,
    linkedRecordCount: 0,
    timerState: null,
    webUrl: `https://app.getkato.io/tasks/${id}`,
    createdAt: dueDate,
    updatedAt: dueDate,
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
    joinUrl: `https://meet.example.com/${id}`,
    webUrl: `https://app.getkato.io/meetings/${id}`,
    linkedMeetingId: id,
  };
}

function notification(id: string, isRead = false): KatoNotification {
  return {
    id,
    type: "assigned",
    category: "assigned",
    entityType: "task",
    entityId: id,
    title: id,
    body: null,
    isRead,
    readAt: isRead ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
    actor: null,
    webUrl: null,
  };
}

function brief(overrides: Partial<DailyBrief> = {}): DailyBrief {
  return {
    tasks: [],
    meetings: [],
    notifications: [],
    integrationIssues: [],
    ...overrides,
  };
}

describe("menu bar model", () => {
  const now = new Date(2026, 7, 29, 12);

  it("counts only overdue work, unread notifications, and integration issues", () => {
    const model = createMenuBarModel(
      brief({
        tasks: [
          task("overdue", new Date(2026, 7, 28, 9).toISOString()),
          task("today", new Date(2026, 7, 29, 15).toISOString()),
        ],
        notifications: [notification("unread"), notification("read", true)],
        integrationIssues: [
          { id: "calendar", title: "Calendar", message: "Reconnect" },
        ],
      }),
      now,
    );

    expect(model.attentionCount).toBe(3);
    expect(model.menuBarTitle).toBe("3");
    expect(model.dueTodayTasks).toHaveLength(1);
  });

  it("shows a meeting countdown ahead of the attention count", () => {
    const model = createMenuBarModel(
      brief({
        meetings: [
          meeting(
            "planning",
            new Date(2026, 7, 29, 12, 8).toISOString(),
            new Date(2026, 7, 29, 12, 38).toISOString(),
          ),
        ],
        notifications: [notification("unread")],
      }),
      now,
    );

    expect(model.menuBarTitle).toBe("8m");
    expect(model.nextMeeting?.id).toBe("planning");
  });

  it("shows Now while a meeting is happening", () => {
    const model = createMenuBarModel(
      brief({
        meetings: [
          meeting(
            "standup",
            new Date(2026, 7, 29, 11, 45).toISOString(),
            new Date(2026, 7, 29, 12, 15).toISOString(),
          ),
        ],
      }),
      now,
    );

    expect(model.menuBarTitle).toBe("Now");
    expect(model.currentMeeting?.id).toBe("standup");
  });

  it("prioritizes overdue and urgent tasks in the menu", () => {
    const model = createMenuBarModel(
      brief({
        tasks: [
          task(
            "today-urgent",
            new Date(2026, 7, 29, 16).toISOString(),
            "urgent",
          ),
          task("overdue-low", new Date(2026, 7, 28, 9).toISOString(), "low"),
          task("overdue-high", new Date(2026, 7, 28, 10).toISOString(), "high"),
        ],
      }),
      now,
    );

    expect(model.featuredTasks.map((item) => item.id)).toEqual([
      "overdue-high",
      "overdue-low",
      "today-urgent",
    ]);
  });
});
