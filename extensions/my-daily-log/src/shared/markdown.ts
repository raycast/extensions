import { DailyLog } from "../domain/dailyLog/DailyLog";
import { capitalize } from "./capitalize";
import { formatLongDate, formatTime, toDateKey } from "./dates";

export function logsToMarkdownList(logs: DailyLog[], options: { includeTime?: boolean } = {}): string {
  const includeTime = options.includeTime ?? true;
  return logs
    .map((log) => (includeTime ? `- ${formatTime(log.date)} ${capitalize(log.title)}` : `- ${capitalize(log.title)}`))
    .join("\n");
}

export function dayToMarkdown(date: Date, logs: DailyLog[], options: { includeTime?: boolean } = {}): string {
  return `## ${formatLongDate(date)}\n\n${logsToMarkdownList(logs, options)}`;
}

/** Markdown of logs spanning several days, with a heading per day. */
export function logsGroupedByDayToMarkdown(logs: DailyLog[], options: { includeTime?: boolean } = {}): string {
  return groupLogsByDay(logs)
    .map(({ date, logs }) => dayToMarkdown(date, logs, options))
    .join("\n\n");
}

export function groupLogsByDay(logs: DailyLog[]): { date: Date; logs: DailyLog[] }[] {
  const groups = new Map<string, { date: Date; logs: DailyLog[] }>();
  [...logs]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .forEach((log) => {
      const key = toDateKey(log.date);
      const group = groups.get(key) ?? { date: log.date, logs: [] };
      group.logs.push(log);
      groups.set(key, group);
    });
  return Array.from(groups.values());
}
