import { groupTasks } from "./dates";
import type { DailyBrief, KatoNotification, ScheduleItem, Task } from "./types";

const PRIORITY_WEIGHT: Record<Task["priority"], number> = {
  no_priority: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export type MenuBarModel = {
  attentionCount: number;
  menuBarTitle: string | undefined;
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  featuredTasks: Task[];
  unreadNotifications: KatoNotification[];
  integrationIssues: DailyBrief["integrationIssues"];
  currentMeeting: ScheduleItem | undefined;
  nextMeeting: ScheduleItem | undefined;
};

function sortTasks(tasks: Task[]) {
  return tasks.toSorted((left, right) => {
    const priority =
      PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
    if (priority) return priority;
    return left.title.localeCompare(right.title);
  });
}

function compactCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function createMenuBarModel(
  brief: DailyBrief,
  now = new Date(),
): MenuBarModel {
  const groupedTasks = groupTasks(brief.tasks, now);
  const overdueTasks = sortTasks(groupedTasks.Overdue);
  const dueTodayTasks = sortTasks(groupedTasks.Today);
  const unreadNotifications = brief.notifications.filter(
    (notification) => !notification.isRead,
  );
  const attentionCount =
    overdueTasks.length +
    unreadNotifications.length +
    brief.integrationIssues.length;

  const activeMeetings = brief.meetings
    .filter(
      (meeting) =>
        !meeting.isAllDay &&
        new Date(meeting.startTime) <= now &&
        new Date(meeting.endTime) > now,
    )
    .toSorted(
      (left, right) => Date.parse(left.startTime) - Date.parse(right.startTime),
    );
  const futureMeetings = brief.meetings
    .filter((meeting) => new Date(meeting.startTime) > now)
    .toSorted((left, right) => {
      if (left.isAllDay !== right.isAllDay) return left.isAllDay ? 1 : -1;
      return Date.parse(left.startTime) - Date.parse(right.startTime);
    });
  const currentMeeting = activeMeetings[0];
  const nextMeeting = currentMeeting ?? futureMeetings[0];

  let menuBarTitle: string | undefined;
  if (currentMeeting) {
    menuBarTitle = "Now";
  } else if (nextMeeting && !nextMeeting.isAllDay) {
    const minutesUntil = Math.ceil(
      (Date.parse(nextMeeting.startTime) - now.getTime()) / 60_000,
    );
    if (minutesUntil > 0 && minutesUntil <= 10) {
      menuBarTitle = `${minutesUntil}m`;
    }
  }
  if (!menuBarTitle && attentionCount) {
    menuBarTitle = compactCount(attentionCount);
  }

  return {
    attentionCount,
    menuBarTitle,
    overdueTasks,
    dueTodayTasks,
    featuredTasks: [...overdueTasks, ...dueTodayTasks].slice(0, 3),
    unreadNotifications,
    integrationIssues: brief.integrationIssues,
    currentMeeting,
    nextMeeting,
  };
}
