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
  const date = new Date(`${value.dateTime}Z`);
  if (!Number.isNaN(date.valueOf())) {
    if (dateOnly) {
      // Match ms-todo's local_due_date: Graph returns writer-zone midnight in UTC.
      const rounded = new Date(date.getTime() + 12 * 60 * 60 * 1000);
      return isoDay(rounded, utc ? localZone : "UTC");
    }
    if (utc) return date.toLocaleString();
  }
  return `${value.dateTime.replace("T", " ")}${value.timeZone ? ` (${value.timeZone})` : ""}`;
}
