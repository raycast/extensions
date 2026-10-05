import { Worklog, WorklogsByDate } from "../types/worklog";

/**
 * Group worklogs by date
 * @param worklogs - Array of worklogs
 * @returns Object with worklogs grouped by date
 */
export function groupWorklogsByDate(worklogs: Worklog[]): WorklogsByDate {
  const grouped: WorklogsByDate = {};

  worklogs.forEach((worklog) => {
    const date = worklog.startDate;
    if (!grouped[date]) {
      grouped[date] = { worklogs: [], totalSeconds: 0 };
    }
    grouped[date].worklogs.push(worklog);
    grouped[date].totalSeconds += worklog.timeSpentSeconds;
  });

  return grouped;
}

/**
 * Sort worklogs within each day by start time
 * @param worklogsByDate - Worklogs grouped by date
 */
export function sortWorklogsByTime(worklogsByDate: WorklogsByDate): void {
  Object.keys(worklogsByDate).forEach((date) => {
    worklogsByDate[date].worklogs.sort((a, b) => {
      const timeA = a.startTime || "00:00:00";
      const timeB = b.startTime || "00:00:00";
      return timeA.localeCompare(timeB);
    });
  });
}
