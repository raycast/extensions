import { convert } from "html-to-text";
import { Task } from "./cli";

export function plainNotes(task: Task): string {
  const body = task.body;
  if (!body?.content) return "";
  return body.contentType.toLowerCase() === "html"
    ? convert(body.content, { wordwrap: false })
    : body.content;
}

export function literalMarkdown(text: string): string {
  // Indentation renders untrusted text literally, without Markdown or HTML links.
  return text
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

export function notesMarkdown(task: Task): string {
  const text = plainNotes(task);
  return text ? literalMarkdown(text) : "No notes.";
}

function isoDay(date: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function graphDate(
  value: Task["dueDateTime"],
  dateOnly = false,
  localZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  if (!value) return "None";
  const utc = value.timeZone?.toUpperCase() === "UTC";
  if (utc) {
    const date = new Date(`${value.dateTime}Z`);
    if (!Number.isNaN(date.valueOf())) {
      if (!dateOnly) return date.toLocaleString();
      const localTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: localZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).format(date);
      if (localTime === "00:00:00" && date.getUTCMilliseconds() === 0) {
        return isoDay(date, localZone);
      }
      return isoDay(new Date(date.getTime() + 12 * 60 * 60 * 1000), "UTC");
    }
  } else if (dateOnly) {
    // A non-UTC Graph response is wall time in its named zone, not a UTC instant.
    const parts =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(
        value.dateTime,
      );
    if (parts) {
      const [, year, month, day, hour, minute, second, fraction = ""] = parts;
      const wall = new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
          Number(fraction.slice(0, 3).padEnd(3, "0")),
        ),
      );
      if (
        !Number.isNaN(wall.valueOf()) &&
        wall.toISOString().slice(0, 19) === value.dateTime.slice(0, 19)
      ) {
        return isoDay(new Date(wall.getTime() + 12 * 60 * 60 * 1000), "UTC");
      }
    }
  }
  return `${value.dateTime.replace("T", " ")}${value.timeZone ? ` (${value.timeZone})` : ""}`;
}
