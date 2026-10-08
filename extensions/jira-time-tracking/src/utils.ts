import { getPreferenceValues } from "@raycast/api";
import { Preferences, WorklogComment, WorklogCommentNode, WorklogEntry, DailyWorklog } from "./types";

export const parseTimeToSeconds = (input: string) => {
  const regex = /^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/;
  const matches = input.trim().match(regex);
  if (matches) {
    const hours = parseInt(matches[1], 10) || 0;
    const minutes = parseInt(matches[2], 10) || 0;
    const seconds = parseInt(matches[3], 10) || 0;
    const total = hours * 3600 + minutes * 60 + seconds;
    return Number.isSafeInteger(total) ? total : 0;
  }
  return 0; // Return 0 if the input doesn't match the expected format
};

export const createJiraUrl = (endpoint: string) => {
  const { domain } = getPreferenceValues<Preferences>();
  const base = /^https?:\/\//i.test(domain.trim()) ? domain.trim() : `https://${domain.trim()}`;
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash || !["https:", "http:"].includes(url.protocol)) {
    throw new Error("Enter your Jira base URL without credentials, query parameters, or fragments.");
  }
  return `${url.toString().replace(/\/$/, "")}${endpoint}`;
};

export const formatSecondsToTimeString = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours && `${hours}h`, minutes && `${minutes}m`, secs && `${secs}s`].filter(Boolean).join(" ") || "0s";
};

export const extractCommentText = (comment?: string | WorklogComment): string => {
  if (!comment) return "";
  if (typeof comment === "string") return comment;
  const text = (node: WorklogCommentNode): string => {
    if (node.text !== undefined) return node.text;
    if (node.type === "mention") return node.attrs?.text || "";
    if (node.type === "hardBreak") return "\n";
    const content = node.content?.map(text).join("") || "";
    return ["paragraph", "heading", "listItem", "tableRow"].includes(node.type) ? `${content}\n` : content;
  };
  return comment.content.map(text).join("").trim();
};

export const getMonthBounds = (date: Date) => ({
  start: new Date(date.getFullYear(), date.getMonth(), 1),
  end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
});

export const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const groupWorklogsByDay = (entries: WorklogEntry[], month: Date): DailyWorklog[] => {
  const { start, end } = getMonthBounds(month);
  const dailyMap = new Map<string, WorklogEntry[]>();
  for (const entry of entries) {
    const date = new Date(entry.worklog.started);
    if (date < start || date > end) continue;
    const key = formatDateKey(date);
    dailyMap.set(key, [...(dailyMap.get(key) || []), entry]);
  }
  const days: DailyWorklog[] = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayEntries = dailyMap.get(formatDateKey(date)) || [];
    if ((date.getDay() >= 1 && date.getDay() <= 5) || dayEntries.length > 0) {
      days.push({
        date: new Date(date),
        entries: dayEntries,
        totalSeconds: dayEntries.reduce((total, entry) => total + entry.worklog.timeSpentSeconds, 0),
      });
    }
  }
  return days.reverse();
};

// Jira doesn't like the trailing Z UTC identifier
export const parseDate = (date: Date) => date.toISOString().replace("Z", "+0000");

export const createTimeLogSuccessMessage = (issueKey: string, seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  let message = `You logged `;
  if (hours > 0) message += `${hours} hour(s) `;
  if (minutes > 0) message += `${minutes} minute(s) `;
  if (remainingSeconds > 0) message += `${remainingSeconds} second(s) `;
  message += `against ${issueKey}.`;

  return message;
};
