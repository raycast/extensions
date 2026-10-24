import { randomUUID } from "node:crypto";
import type { Entry, Template } from "./types.ts";
import { normalizeTime } from "./time.ts";

const HEADERS = ["Login", "Name", "Time in", "Time out"];
/** Escape markdown as well as delimiters, so names cannot inject emphasis or links. */
export function escapeCell(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/[|*_`[\]~]/g, "\\$&")
    .replace(/\r?\n/g, "<br>");
}
export function timeInLabel(entry: Entry): string {
  return entry.status === "no_show" ? "" : entry.timeIn || "—";
}
export function timeOutLabel(entry: Entry): string {
  return entry.status === "no_show" ? "No Show" : entry.timeOut || "—";
}
export function renderTable(entries: Entry[], selectedId?: string): string {
  const rows = entries.map((entry) => {
    const cells = [entry.login, entry.name, timeInLabel(entry), timeOutLabel(entry)].map(escapeCell);
    return `| ${cells.map((cell) => (entry.id === selectedId && cell ? `**${cell}**` : cell)).join(" | ")} |`;
  });
  return ["| Login | Name | Time in | Time out |", "| --- | --- | --- | --- |", ...rows].join("\n");
}
/** Attendance uses the current template text above the complete roster table. */
export function renderAttendance(template: Template | undefined, entries: Entry[], selectedId?: string): string {
  const notes = template?.notes ?? "";
  return [
    template?.heading?.trim() ? `# ${escapeCell(template.heading.trim())}` : "",
    notes.trim(),
    renderTable(entries, selectedId),
  ]
    .filter(Boolean)
    .join("\n\n");
}
/** An explicit heading line keeps notes beginning with # unambiguous when the heading is empty. */
export function renderAttendanceEditor(template: Template, entries: Entry[]): string {
  return [`# ${escapeCell(template.heading?.trim() ?? "")}`, template.notes?.trim(), renderTable(entries)]
    .filter((section) => section !== undefined && section !== "")
    .join("\n\n");
}
export function parseAttendanceMarkdown(markdown: string, template: Template, previous: Entry[] = []) {
  const lines = markdown.trim().split(/\r?\n/);
  let tableStart = -1;
  // Notes can contain other tables; the final attendance header starts the roster.
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      if (splitRow(lines[i]).every((cell, index) => cell.toLowerCase() === HEADERS[index].toLowerCase())) {
        tableStart = i;
        break;
      }
    } catch {
      /* A prose line is not a table header. */
    }
  }
  if (tableStart < 0)
    throw new Error("Keep the attendance table at the bottom with Login | Name | Time in | Time out columns.");
  const prefix = lines.slice(0, tableStart);
  const headingMatch = /^#(?:[ \t]+(.*))?$/.exec(prefix[0] ?? "");
  const heading = headingMatch ? decodeCell(headingMatch[1]?.trim() ?? "") : "";
  const notes = prefix
    .slice(headingMatch ? 1 : 0)
    .join("\n")
    .trim();
  const updatedTemplate = { ...template, heading, notes };
  return {
    template: updatedTemplate,
    entries: parseTable(lines.slice(tableStart).join("\n"), updatedTemplate, previous),
  };
}
export function renderNote(entry: Entry): string {
  const values: Record<string, string> = {
    login: entry.login,
    name: entry.name,
    time_in: timeInLabel(entry),
    time_out: timeOutLabel(entry),
  };
  const sections = [
    entry.templateHeading?.trim() ? `# ${entry.templateHeading.trim()}` : "",
    entry.templateNotes,
    entry.templateBody,
  ];
  return sections
    .filter((section) => section?.trim())
    .join("\n\n")
    .replace(/\{\{(login|name|time_in|time_out)\}\}/g, (_, key: string) => escapeCell(values[key]));
}
export function newEntry(login: string, name: string, template: Template, sharedTimeIn: string): Entry {
  if (!login.trim() || !name.trim()) throw new Error("Login and name are required.");
  return {
    id: randomUUID(),
    login: login.trim(),
    name: name.trim(),
    timeIn: normalizeTime(sharedTimeIn),
    timeOut: "",
    status: "present",
    templateId: template.id,
    templateBody: template.body,
    templateHeading: template.heading ?? "",
    templateNotes: template.notes ?? "",
  };
}
function splitRow(line: string): string[] {
  const text = line.trim();
  const cells: string[] = [];
  let cell = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\\" && i + 1 < text.length) {
      cell += char + text[++i];
    } else if (char === "|") {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  cells.push(cell.trim());
  if (text.startsWith("|")) cells.shift();
  // Only remove an actual terminal delimiter, not an escaped pipe in the last cell.
  if (cells[cells.length - 1] === "" && /\|$/.test(text)) cells.pop();
  if (cells.length !== 4) throw new Error("Each table row must contain exactly four columns.");
  return cells;
}
function decodeCell(cell: string): string {
  const plain = cell.startsWith("**") && cell.endsWith("**") ? cell.slice(2, -2) : cell;
  return plain
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/\\([\\|*_`[\]~])/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
/** Parse fully before saving: malformed input can never partially replace attendance. */
export function parseTable(markdown: string, template: Template, previous: Entry[] = []): Entry[] {
  const lines = markdown.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("Include a header and separator row.");
  const headers = splitRow(lines[0]);
  if (!headers.every((header, i) => header.toLowerCase() === HEADERS[i].toLowerCase())) {
    throw new Error("Columns must be Login | Name | Time in | Time out, in that order.");
  }
  if (!splitRow(lines[1]).every((cell) => /^:?-{3,}:?$/.test(cell))) throw new Error("Invalid table separator row.");
  const unused = [...previous];
  return lines.slice(2).map((line, index) => {
    try {
      const [login, name, timeIn, timeOut] = splitRow(line).map(decodeCell);
      const entry = newEntry(login, name, template, normalizeTime(timeIn));
      const match = unused.findIndex((item) => item.login === entry.login);
      if (match >= 0) {
        const old = unused.splice(match, 1)[0];
        entry.id = old.id;
        entry.templateId = old.templateId;
        entry.templateBody = old.templateBody;
        entry.templateHeading = old.templateHeading;
        entry.templateNotes = old.templateNotes;
      }
      entry.status = timeOut.toLowerCase() === "no show" ? "no_show" : "present";
      entry.timeOut = entry.status === "no_show" ? "" : normalizeTime(timeOut);
      if (entry.timeOut) entry.status = "clocked_out";
      return entry;
    } catch (error) {
      throw new Error(`Row ${index + 3}: ${error instanceof Error ? error.message : "Invalid row."}`);
    }
  });
}
