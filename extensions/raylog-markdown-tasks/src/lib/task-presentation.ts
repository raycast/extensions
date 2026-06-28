import type { TaskRecord } from "./types";

export function matchesTaskSearch(task: TaskRecord, normalizedSearch: string, includeWorkLogs: boolean): boolean {
  if (task.header.toLowerCase().includes(normalizedSearch) || task.body.toLowerCase().includes(normalizedSearch)) {
    return true;
  }

  if (!includeWorkLogs) {
    return false;
  }

  return task.workLogs.some((workLog) => workLog.body.toLowerCase().includes(normalizedSearch));
}

export function buildTaskDetailMarkdown(task: TaskRecord, options?: { includeTopSpacer?: boolean }): string {
  const topSpacer = options?.includeTopSpacer ? "⁠\n" : "";
  const safeHeader = escapeMarkdown(task.header);
  const trimmedBody = task.body.trim();
  const body = trimmedBody;
  const createdLabel = `◷ Created ${escapeMarkdown(formatCompactDateTime(task.createdAt))}`;
  const wasEdited = new Date(task.updatedAt).getTime() > new Date(task.createdAt).getTime();
  const taskTimeline = wasEdited
    ? `\`${createdLabel} -> ✎ Edited ${escapeMarkdown(formatCompactDateTime(task.updatedAt))}\``
    : `\`${createdLabel}\``;
  const workLogSections = task.workLogs
    .map((workLog, index) => buildWorkLogMarkdown(workLog, index))
    .join("\n\n---\n\n");

  if (!workLogSections) {
    if (!body) {
      return `${topSpacer}${taskTimeline}\n# ${safeHeader}`;
    }

    return `${topSpacer}${taskTimeline}\n# ${safeHeader}\n\n---\n\n${body}`;
  }

  if (!body) {
    return `${topSpacer}${taskTimeline}\n# ${safeHeader}\n\n---\n\n${workLogSections}`;
  }

  return `${topSpacer}${taskTimeline}\n# ${safeHeader}\n\n---\n\n${body}\n\n---\n\n${workLogSections}`;
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

export function formatCompactDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function buildWorkLogMarkdown(workLog: TaskRecord["workLogs"][number], index: number): string {
  const createdLabel = `◷ Logged ${escapeMarkdown(formatCompactDateTime(workLog.createdAt))}`;
  const wasEdited =
    workLog.updatedAt !== null && new Date(workLog.updatedAt).getTime() > new Date(workLog.createdAt).getTime();
  const workLogTimeline = wasEdited
    ? `\`${createdLabel} -> ✎ Edited ${escapeMarkdown(formatCompactDateTime(workLog.updatedAt as string))}\``
    : `\`${createdLabel}\``;

  return `📝 **Work Log ${index + 1}**\n\n${workLogTimeline}\n\n${workLog.body}`;
}
