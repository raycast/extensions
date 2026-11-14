import { formatInputTime } from "./date-time-input";
import { formatLogDate, isSameLocalDay } from "./date";
import type { TimeDraft, TimeEndpoint } from "./time-editing";

export function timeEditingMarkdown(draft: TimeDraft, endpoint: TimeEndpoint, now: Date): string {
  const start = new Date(draft.startedAt);
  const end = draft.endedAt ? new Date(draft.endedAt) : now;
  const sameDay = isSameLocalDay(start, end);
  const dateSuffix = (date: Date) => (sameDay ? "" : ` · ${formatLogDate(date.toISOString())}`);
  // Raycast's built-in math renderer supports typewriter text without image swaps.
  const time = (date: Date) => `\\(\\texttt{${formatInputTime(date)}}\\)`;
  const values = [
    `Start · ${time(start)}${dateSuffix(start)}`,
    `End\u2002 · ${draft.endedAt ? time(end) : "Now (Running)"}${dateSuffix(end)}`,
  ];
  // Only append the marker; the text before it is identical in either focus state.
  const row = (text: string, selected: boolean) => `## ${text}${selected ? "　←" : ""}`;

  return [
    ...(sameDay ? [formatLogDate(start.toISOString()), ""] : []),
    row(values[0], endpoint === "start"),
    "",
    row(values[1], endpoint === "end" && Boolean(draft.endedAt)),
  ].join("\n");
}
