import { formatInputTime } from "./date-time-input";
import { formatLogDate, isSameLocalDay } from "./date";
import { formatDuration } from "./duration";
import type { TimeDraft, TimeEndpoint } from "./time-editing";

export function timeEditingMarkdown(original: TimeDraft, draft: TimeDraft, endpoint: TimeEndpoint, now: Date): string {
  const start = new Date(draft.startedAt);
  const end = draft.endedAt ? new Date(draft.endedAt) : now;
  const beforeStart = new Date(original.startedAt);
  const beforeEnd = original.endedAt ? new Date(original.endedAt) : now;
  const duration = (startedAt: Date, endedAt: Date) =>
    formatDuration(Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)));
  const sameDay = isSameLocalDay(start, end);
  const dateSuffix = (date: Date) => (sameDay ? "" : ` · ${formatLogDate(date.toISOString())}`);
  const values = [
    `Start · ${formatInputTime(start)}${dateSuffix(start)}`,
    `End   · ${draft.endedAt ? formatInputTime(end) : "Now (Running)"}${dateSuffix(end)}`,
  ];
  // Reserve the brackets' space on both rows so moving focus never indents text.
  const row = (text: string, selected: boolean) => {
    const value = selected ? `[ ${text} ]` : `  ${text}  `;
    // Keep reserved selection space when rendered as a native heading.
    return `## ${value.replaceAll(" ", "\u00a0")}`;
  };

  return [
    ...(sameDay ? [formatLogDate(start.toISOString()), ""] : []),
    row(values[0], endpoint === "start"),
    "",
    row(values[1], endpoint === "end" && Boolean(draft.endedAt)),
    "",
    `${draft.endedAt ? "Duration" : "Elapsed"} · ${duration(beforeStart, beforeEnd)} → **${duration(start, end)}**`,
  ].join("\n");
}
